import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import {
  DEFAULT_PORT,
  TRACE_CATEGORIES,
  adb,
  adbArgs,
  findAdb,
  ensureSingleDevice,
  sleep,
  readDefaultPackageName,
  CdpClient,
  timestampForFile,
  connectWebView,
} from "./android-adb-lib.mjs";

const SCRIPT_VERSION = "1.0.0";
const DEFAULT_OUT_DIR = "traces/debug";
const DEBUG_TRACE_GLOBAL = "window.__ASMC4_DEBUG_TRACE__";

function parseArgs(argv) {
  const args = {
    port: DEFAULT_PORT,
    outDir: DEFAULT_OUT_DIR,
    packageName: null,
    device: null,
    target: null,
    launch: true,
    latest: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--no-launch") args.launch = false;
    else if (arg === "--latest") args.latest = true;
    else if (arg === "--port") args.port = Number(argv[++i]);
    else if (arg.startsWith("--port=")) args.port = Number(arg.slice("--port=".length));
    else if (arg === "--out") args.outDir = argv[++i];
    else if (arg.startsWith("--out=")) args.outDir = arg.slice("--out=".length);
    else if (arg === "--package") args.packageName = argv[++i];
    else if (arg.startsWith("--package=")) args.packageName = arg.slice("--package=".length);
    else if (arg === "--device") args.device = argv[++i];
    else if (arg.startsWith("--device=")) args.device = arg.slice("--device=".length);
    else if (arg === "--target") args.target = argv[++i];
    else if (arg.startsWith("--target=")) args.target = arg.slice("--target=".length);
    else if (arg === "--help" || arg === "-h") {
      args.help = true;
    } else {
      throw new Error(`未知参数：${arg}`);
    }
  }

  if (!Number.isInteger(args.port) || args.port <= 0 || args.port > 65535) {
    throw new Error("--port 必须是 1–65535 之间的整数");
  }
  return args;
}

function usage() {
  return [
    "用法：npm run debug:record -- [选项]",
    "",
    "一键录制 bug 复现材料：应用内 trace + WebView trace + logcat。",
    "",
    "常用：",
    "  npm run debug:record",
    "  npm run debug:record -- --device SERIAL",
    "  npm run debug:record -- --latest",
    "",
    "选项：",
    "  --no-launch      不自动启动 App",
    "  --package NAME   指定 Android 包名",
    "  --device SERIAL  多设备时指定 adb 设备（USB / 无线均可）",
    "  --target TEXT    按 URL/title 过滤 WebView target",
    "  --out DIR        输出根目录，默认 traces/debug",
    "  --latest         打印 traces/debug 下最新录制目录并退出",
  ].join("\n");
}

export async function findLatestDebugTraceDir(baseDir = DEFAULT_OUT_DIR) {
  let entries;
  try {
    entries = await fs.readdir(baseDir, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
  const dirs = entries
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .sort()
    .reverse();
  return dirs[0] ? path.resolve(baseDir, dirs[0]) : null;
}

async function waitForDebugTraceApi(client) {
  for (let i = 0; i < 24; i += 1) {
    const result = await client.send("Runtime.evaluate", {
      expression: `typeof ${DEBUG_TRACE_GLOBAL}`,
      returnByValue: true,
    });
    if (result.result?.value === "object") return;
    await sleep(250);
  }
  throw new Error("应用内调试 trace 未就绪。请确认已安装含 __ASMC4_DEBUG_TRACE__ 的最新 debug 包。");
}

async function resetAndEnableAppTrace(client) {
  const result = await client.send("Runtime.evaluate", {
    expression: `(() => {
      const api = ${DEBUG_TRACE_GLOBAL};
      if (!api) return { ok: false, error: "missing" };
      api.clear();
      return { ok: true, enabled: api.isEnabled(), count: api.getEntryCount() };
    })()`,
    returnByValue: true,
    awaitPromise: true,
  });
  const value = result.result?.value;
  if (!value?.ok) {
    throw new Error("无法清空并启用应用内 trace。");
  }
}

async function exportAppTraceJson(client) {
  const result = await client.send("Runtime.evaluate", {
    expression: `${DEBUG_TRACE_GLOBAL} ? ${DEBUG_TRACE_GLOBAL}.exportJson() : null`,
    returnByValue: true,
    awaitPromise: true,
  });
  const json = result.result?.value;
  if (typeof json !== "string" || !json) {
    throw new Error("无法从 WebView 导出应用内 trace。");
  }
  return json;
}

function startLogcatCapture(adbPath, device, pid) {
  const chunks = [];
  const child = spawn(adbPath, adbArgs(["logcat", "-v", "threadtime", "--pid", String(pid)], device), {
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.on("data", chunk => chunks.push(chunk));
  child.stderr.on("data", chunk => chunks.push(chunk));

  return {
    async stop() {
      if (!child.killed) child.kill();
      await new Promise(resolve => {
        if (child.exitCode != null) {
          resolve();
          return;
        }
        child.once("close", resolve);
        setTimeout(resolve, 1500);
      });
      return Buffer.concat(chunks).toString("utf8");
    }
  };
}

async function recordWebViewTrace(client, rl) {
  const events = [];
  let completeResolve;
  const complete = new Promise(resolve => { completeResolve = resolve; });

  const onDataCollected = params => {
    if (Array.isArray(params.value)) events.push(...params.value);
  };
  const onTracingComplete = () => completeResolve();

  client.on("Tracing.dataCollected", onDataCollected);
  client.on("Tracing.tracingComplete", onTracingComplete);

  const startedAt = new Date();
  await client.send("Tracing.start", {
    categories: TRACE_CATEGORIES,
    transferMode: "ReportEvents",
    options: "sampling-frequency=10000",
  });

  await rl.question("已开始录制。请在手机上复现问题，完成后按回车停止...");

  try {
    await client.send("Tracing.end");
    await complete;
  } finally {
    client.off("Tracing.dataCollected", onDataCollected);
    client.off("Tracing.tracingComplete", onTracingComplete);
  }

  const endedAt = new Date();
  return {
    events,
    startedAt,
    endedAt,
    durationSeconds: (endedAt.getTime() - startedAt.getTime()) / 1000,
  };
}

function summarizeAppTrace(appTrace) {
  const entries = Array.isArray(appTrace?.entries) ? appTrace.entries : [];
  const byKind = new Map();
  const byName = new Map();
  for (const entry of entries) {
    byKind.set(entry.kind, (byKind.get(entry.kind) || 0) + 1);
    byName.set(entry.name, (byName.get(entry.name) || 0) + 1);
  }
  const recent = entries.slice(-30);
  return { entries, byKind, byName, recent };
}

function pickLogcatHighlights(logcatText) {
  const lines = logcatText.split(/\r?\n/).filter(Boolean);
  const errors = lines.filter(line => /\s[EF]\s/.test(line) || /FATAL|AndroidRuntime|Exception/.test(line));
  return {
    lineCount: lines.length,
    errors: errors.slice(-40),
  };
}

function buildSummary({ meta, appTrace, webviewRecording, logcatText }) {
  const app = summarizeAppTrace(appTrace);
  const logcat = pickLogcatHighlights(logcatText);
  const complete = webviewRecording.events.filter(event => event.ph === "X" && Number.isFinite(event.dur));
  const longEvents = complete
    .filter(event => event.dur >= 8000)
    .sort((a, b) => b.dur - a.dur)
    .slice(0, 10);

  const lines = [];
  lines.push("# ASMC4 Debug 录制摘要");
  lines.push("");
  lines.push(`- 开始：${meta.startedAt}`);
  lines.push(`- 结束：${meta.endedAt}`);
  lines.push(`- 时长：${meta.durationSeconds.toFixed(2)}s`);
  lines.push(`- 包名：${meta.packageName}`);
  lines.push(`- 设备：${meta.device}`);
  lines.push(`- PID：${meta.pid}`);
  lines.push(`- WebView：${meta.targetTitle || "(untitled)"}`);
  lines.push(`- URL：${meta.targetUrl || "(unknown)"}`);
  lines.push(`- 脚本：android-debug-record.mjs v${meta.scriptVersion}`);
  lines.push("");
  lines.push("## 应用内 trace");
  lines.push("");
  lines.push(`- 条目数：${app.entries.length}`);
  lines.push(`- 导出时 enabled：${appTrace?.enabled === true ? "是" : "否"}`);
  lines.push(`- 构建时间：${appTrace?.buildTimestamp || "(unknown)"}`);
  if (app.byKind.size) {
    lines.push("- 按 kind：");
    for (const [kind, count] of [...app.byKind.entries()].sort((a, b) => b[1] - a[1])) {
      lines.push(`  - ${kind}: ${count}`);
    }
  }
  if (app.byName.size) {
    lines.push("- 高频事件：");
    [...app.byName.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .forEach(([name, count]) => lines.push(`  - ${name}: ${count}`));
  }
  lines.push("");
  lines.push("### 最近 30 条");
  lines.push("");
  if (app.recent.length) {
    for (const entry of app.recent) {
      const data = entry.data != null ? ` ${JSON.stringify(entry.data)}` : "";
      lines.push(`- [${entry.kind}] ${entry.name}${data}`);
    }
  } else {
    lines.push("（无）");
  }
  lines.push("");
  lines.push("## logcat");
  lines.push("");
  lines.push(`- 行数：${logcat.lineCount}`);
  lines.push(`- 错误/异常行（末尾最多 40 条）：${logcat.errors.length}`);
  if (logcat.errors.length) {
    lines.push("");
    lines.push("```");
    logcat.errors.forEach(line => lines.push(line));
    lines.push("```");
  } else {
    lines.push("");
    lines.push("未发现明显的 E/FATAL/Exception 行。");
  }
  lines.push("");
  lines.push("## WebView trace");
  lines.push("");
  lines.push(`- events：${webviewRecording.events.length}`);
  if (longEvents.length) {
    lines.push("- 超过 8ms 的事件：");
    for (const event of longEvents) {
      lines.push(`  - ${event.name}: ${(event.dur / 1000).toFixed(2)}ms`);
    }
  } else {
    lines.push("- 未发现超过 8ms 的 complete event。");
  }
  lines.push("");
  lines.push("## 文件");
  lines.push("");
  lines.push("- `app-trace.json`：应用内业务/手势/状态快照");
  lines.push("- `webview-trace.json`：Chrome Performance trace");
  lines.push("- `logcat.txt`：Android 系统与应用日志");
  lines.push("- `manifest.json`：元数据索引");
  lines.push("");
  lines.push("智能体默认读取 `traces/debug/` 下最新目录；也可用 `npm run debug:record -- --latest` 打印路径。");
  return lines.join("\n");
}

async function saveDebugRecording({
  args,
  packageName,
  device,
  pid,
  socketName,
  port,
  target,
  webviewRecording,
  appTraceJson,
  logcatText,
}) {
  const startedAt = webviewRecording.startedAt;
  const endedAt = webviewRecording.endedAt;
  const stamp = timestampForFile(startedAt);
  const outDir = path.resolve(args.outDir, stamp);
  await fs.mkdir(path.join(outDir, "screens"), { recursive: true });

  const meta = {
    generatedBy: "scripts/android-debug-record.mjs",
    scriptVersion: SCRIPT_VERSION,
    startedAt: startedAt.toISOString(),
    endedAt: endedAt.toISOString(),
    durationSeconds: webviewRecording.durationSeconds,
    packageName,
    device,
    pid,
    socketName,
    port,
    targetTitle: target.title,
    targetUrl: target.url,
  };

  const files = {
    appTrace: "app-trace.json",
    webviewTrace: "webview-trace.json",
    logcat: "logcat.txt",
    summary: "summary.md",
    screens: "screens/",
  };

  const appTracePath = path.join(outDir, files.appTrace);
  const webviewTracePath = path.join(outDir, files.webviewTrace);
  const logcatPath = path.join(outDir, files.logcat);
  const summaryPath = path.join(outDir, files.summary);
  const manifestPath = path.join(outDir, "manifest.json");

  let appTrace = null;
  try {
    appTrace = JSON.parse(appTraceJson);
  } catch {
    appTrace = { parseError: true, raw: appTraceJson };
  }

  await fs.writeFile(appTracePath, appTraceJson, "utf8");
  await fs.writeFile(webviewTracePath, JSON.stringify({
    traceEvents: webviewRecording.events,
    metadata: meta,
  }), "utf8");
  await fs.writeFile(logcatPath, logcatText, "utf8");
  await fs.writeFile(summaryPath, buildSummary({
    meta,
    appTrace,
    webviewRecording,
    logcatText,
  }), "utf8");
  await fs.writeFile(manifestPath, JSON.stringify({
    ...meta,
    directory: outDir,
    files,
  }, null, 2), "utf8");

  return {
    outDir,
    summaryPath,
    manifestPath,
    appTracePath,
    webviewTracePath,
    logcatPath,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    return;
  }

  if (args.latest) {
    const latest = await findLatestDebugTraceDir(args.outDir);
    if (!latest) {
      console.log(`未找到录制目录：${path.resolve(args.outDir)}`);
      return;
    }
    console.log(latest);
    return;
  }

  const packageName = args.packageName || await readDefaultPackageName();
  if (!packageName) throw new Error("无法从 capacitor.config.json 读取 appId，请用 --package 指定包名。");

  const adbPath = await findAdb();
  const device = await ensureSingleDevice(adbPath, args.device);
  const connection = await connectWebView({
    adbPath,
    device,
    packageName,
    launch: args.launch,
    port: args.port,
    targetQuery: args.target,
  });
  const { target, pid, socketName, port } = connection;

  console.log(`已连接 WebView：${target.title || "(untitled)"}`);

  const client = new CdpClient(target.webSocketDebuggerUrl);
  await client.connect();
  const rl = readline.createInterface({ input, output });

  try {
    await waitForDebugTraceApi(client);

    console.log("");
    console.log("准备就绪。按回车开始录制，Ctrl+C 退出。");

    for (;;) {
      await rl.question("");
      await resetAndEnableAppTrace(client);
      await adb(adbPath, ["logcat", "-c"], device).catch(() => {});
      const logcatCapture = startLogcatCapture(adbPath, device, pid);

      let webviewRecording;
      let appTraceJson;
      let logcatText;
      try {
        webviewRecording = await recordWebViewTrace(client, rl);
        appTraceJson = await exportAppTraceJson(client);
      } finally {
        logcatText = await logcatCapture.stop();
      }

      const saved = await saveDebugRecording({
        args,
        packageName,
        device,
        pid,
        socketName,
        port,
        target,
        webviewRecording,
        appTraceJson,
        logcatText,
      });

      console.log("");
      console.log("完成。生成目录：");
      console.log(saved.outDir);
      console.log("");
      console.log("文件：");
      console.log(`- ${saved.summaryPath}`);
      console.log(`- ${saved.manifestPath}`);
      console.log(`- ${saved.appTracePath}`);
      console.log(`- ${saved.webviewTracePath}`);
      console.log(`- ${saved.logcatPath}`);
      console.log("");
      console.log("按回车开始下一次录制，Ctrl+C 退出。");
    }
  } finally {
    rl.close();
    client.close();
  }
}

main().catch(error => {
  console.error("");
  console.error(`失败：${error.message}`);
  if (error.stderr) console.error(String(error.stderr).trim());
  process.exitCode = 1;
});
