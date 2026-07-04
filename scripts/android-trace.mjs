import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const DEFAULT_PORT = 9229;
const DEFAULT_SECONDS = 12;
const DEFAULT_OUT_DIR = "traces/android";
const TRACE_CATEGORIES = [
  "toplevel",
  "blink",
  "blink.user_timing",
  "devtools.timeline",
  "disabled-by-default-devtools.timeline",
  "disabled-by-default-devtools.timeline.frame",
  "disabled-by-default-devtools.timeline.stack",
  "disabled-by-default-devtools.screenshot",
  "cc",
  "renderer.scheduler",
  "latencyInfo",
  "input",
  "benchmark",
].join(",");

function parseArgs(argv) {
  const args = {
    seconds: DEFAULT_SECONDS,
    manual: false,
    port: DEFAULT_PORT,
    outDir: DEFAULT_OUT_DIR,
    packageName: null,
    device: null,
    target: null,
    launch: true,
    diagnosticLite: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--manual") args.manual = true;
    else if (arg === "--no-launch") args.launch = false;
    else if (arg === "--diagnostic-lite" || arg === "--lite") args.diagnosticLite = true;
    else if (arg === "--seconds") args.seconds = Number(argv[++i]);
    else if (arg.startsWith("--seconds=")) args.seconds = Number(arg.slice("--seconds=".length));
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

  if (!Number.isFinite(args.seconds) || args.seconds <= 0) {
    throw new Error("--seconds 必须是正数");
  }
  if (!Number.isInteger(args.port) || args.port <= 0) {
    throw new Error("--port 必须是正整数");
  }
  return args;
}

function usage() {
  return [
    "用法：npm run trace:android -- [选项]",
    "",
    "常用：",
    "  npm run trace:android",
    "  npm run trace:android -- --seconds 20",
    "  npm run trace:android -- --manual",
    "",
    "选项：",
    "  --seconds N      自动录制 N 秒，默认 12",
    "  --manual         手动按回车停止录制",
    "  --no-launch      不自动启动 App",
    "  --package NAME   指定 Android 包名",
    "  --device SERIAL  多设备时指定 adb 设备",
    "  --target TEXT    按 URL/title 过滤 WebView target",
    "  --out DIR        输出目录，默认 traces/android",
    "  --diagnostic-lite",
    "                   录制时临时禁用面板阴影/伪元素，用于对照 GL 合成成本",
  ].join("\n");
}

async function readDefaultPackageName() {
  try {
    const raw = await fs.readFile("capacitor.config.json", "utf8");
    const config = JSON.parse(raw);
    return config.appId || null;
  } catch {
    return null;
  }
}

function execFileText(file, args, options = {}) {
  return new Promise((resolve, reject) => {
    execFile(file, args, {
      cwd: process.cwd(),
      windowsHide: true,
      maxBuffer: 12 * 1024 * 1024,
      ...options,
    }, (error, stdout, stderr) => {
      if (error) {
        error.stdout = stdout;
        error.stderr = stderr;
        reject(error);
        return;
      }
      resolve(String(stdout || ""));
    });
  });
}

async function findAdb() {
  const names = process.platform === "win32" ? ["adb.exe", "adb"] : ["adb"];
  const roots = [process.env.ANDROID_HOME, process.env.ANDROID_SDK_ROOT].filter(Boolean);
  const candidates = [
    ...roots.flatMap(root => names.map(name => path.join(root, "platform-tools", name))),
    ...names,
  ];

  for (const candidate of candidates) {
    try {
      await execFileText(candidate, ["version"]);
      return candidate;
    } catch {
      // Try the next candidate.
    }
  }
  throw new Error("找不到 adb。请确认 Android SDK platform-tools 已加入 PATH，或设置 ANDROID_HOME。");
}

function adbArgs(args, device) {
  return device ? ["-s", device, ...args] : args;
}

async function adb(adbPath, args, device) {
  return execFileText(adbPath, adbArgs(args, device));
}

async function ensureSingleDevice(adbPath, device) {
  if (device) return device;
  const raw = await execFileText(adbPath, ["devices"]);
  const devices = raw
    .split(/\r?\n/)
    .slice(1)
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => line.split(/\s+/))
    .filter(([, state]) => state === "device")
    .map(([serial]) => serial);

  if (devices.length === 0) {
    throw new Error("没有发现已连接并授权的 Android 设备。");
  }
  if (devices.length > 1) {
    throw new Error(`发现多台设备，请加 --device 指定其中一台：${devices.join(", ")}`);
  }
  return devices[0];
}

async function sleep(ms) {
  await new Promise(resolve => setTimeout(resolve, ms));
}

async function getPid(adbPath, device, packageName) {
  const raw = await adb(adbPath, ["shell", "pidof", packageName], device).catch(() => "");
  const pid = raw.trim().split(/\s+/)[0];
  return pid || null;
}

async function launchApp(adbPath, device, packageName) {
  await adb(adbPath, ["shell", "monkey", "-p", packageName, "1"], device);
}

async function waitForPid(adbPath, device, packageName) {
  for (let i = 0; i < 20; i += 1) {
    const pid = await getPid(adbPath, device, packageName);
    if (pid) return pid;
    await sleep(250);
  }
  throw new Error(`App 未运行，无法找到进程：${packageName}`);
}

async function findWebViewSocket(adbPath, device, pid) {
  const preferred = `webview_devtools_remote_${pid}`;
  const raw = await adb(adbPath, ["shell", "cat", "/proc/net/unix"], device);
  const sockets = [...raw.matchAll(/@?(webview_devtools_remote[^\s]*)/g)].map(match => match[1]);

  if (sockets.includes(preferred)) return preferred;
  if (sockets.length === 1) return sockets[0];
  if (sockets.length > 1) {
    const samePid = sockets.find(socket => socket.endsWith(`_${pid}`));
    if (samePid) return samePid;
    throw new Error(`发现多个 WebView 调试端口，无法自动判断：${sockets.join(", ")}`);
  }
  throw new Error("没有发现 WebView 调试端口。请确认安装的是 debug 版，且 WebView debugging 已开启。");
}

async function forwardWebView(adbPath, device, socketName, startPort) {
  let lastError = null;
  for (let port = startPort; port < startPort + 30; port += 1) {
    try {
      await adb(adbPath, ["forward", `tcp:${port}`, `localabstract:${socketName}`], device);
      return port;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error("无法建立 adb forward。");
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url} 返回 ${response.status}`);
  return response.json();
}

async function findTarget(port, query) {
  let targets = [];
  for (let i = 0; i < 20; i += 1) {
    targets = await fetchJson(`http://127.0.0.1:${port}/json/list`).catch(() => []);
    if (targets.length) break;
    await sleep(250);
  }

  const filtered = targets.filter(target => target.webSocketDebuggerUrl);
  const byQuery = query
    ? filtered.find(target => `${target.title || ""} ${target.url || ""}`.toLowerCase().includes(query.toLowerCase()))
    : null;
  if (byQuery) return byQuery;

  const likely = filtered.find(target => {
    const haystack = `${target.title || ""} ${target.url || ""}`.toLowerCase();
    return haystack.includes("localhost")
      || haystack.includes("capacitor")
      || haystack.includes("index.html")
      || target.type === "page";
  });
  if (likely) return likely;

  if (filtered[0]) return filtered[0];
  throw new Error("WebView 已连接，但没有可录制的页面 target。");
}

class CdpClient {
  constructor(url) {
    this.url = url;
    this.ws = null;
    this.nextId = 1;
    this.pending = new Map();
    this.handlers = new Map();
  }

  async connect() {
    this.ws = new WebSocket(this.url);
    await new Promise((resolve, reject) => {
      this.ws.addEventListener("open", resolve, { once: true });
      this.ws.addEventListener("error", reject, { once: true });
    });
    this.ws.addEventListener("message", event => this.handleMessage(event.data));
    this.ws.addEventListener("close", () => {
      for (const { reject } of this.pending.values()) {
        reject(new Error("CDP 连接已关闭"));
      }
      this.pending.clear();
    });
  }

  handleMessage(raw) {
    const message = JSON.parse(String(raw));
    if (message.id) {
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      if (message.error) pending.reject(new Error(message.error.message || "CDP error"));
      else pending.resolve(message.result);
      return;
    }
    if (message.method) {
      const handlers = this.handlers.get(message.method) || [];
      handlers.forEach(handler => handler(message.params || {}));
    }
  }

  send(method, params = {}) {
    const id = this.nextId++;
    const payload = JSON.stringify({ id, method, params });
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(payload);
    });
  }

  on(method, handler) {
    const handlers = this.handlers.get(method) || [];
    handlers.push(handler);
    this.handlers.set(method, handlers);
  }

  close() {
    this.ws?.close();
  }
}

function timestampForFile(date = new Date()) {
  const pad = value => String(value).padStart(2, "0");
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    "-",
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join("");
}

function formatMs(us) {
  return `${(us / 1000).toFixed(2)}ms`;
}

function summarizeEvents(events, meta) {
  const complete = events.filter(event => event.ph === "X" && Number.isFinite(event.dur));
  const totalDur = complete.reduce((sum, event) => sum + event.dur, 0);
  const inputEvents = complete.filter(event => event.name === "EventDispatch");
  const minInputTs = inputEvents.reduce((min, event) => Math.min(min, event.ts), Infinity);
  const maxInputTs = inputEvents.reduce((max, event) => Math.max(max, event.ts + event.dur), 0);
  const inputRangeUs = Number.isFinite(minInputTs) && maxInputTs > minInputTs
    ? maxInputTs - minInputTs
    : 0;
  const wallDuration = Number.isFinite(meta.durationSeconds) ? meta.durationSeconds : null;

  const groups = [
    ["Layout", /^(Layout|UpdateLayoutTree|RecalculateStyles|InvalidateLayout|ScheduleStyleRecalculation)$/],
    ["Paint", /^(Paint|PrePaint|PaintSetup|RasterTask|CompositeLayers|Layerize)$/],
    ["Script", /^(FunctionCall|EvaluateScript|EventDispatch|TimerFire|FireAnimationFrame|RunTask|V8\.Execute)$/],
    ["Input", /^(EventDispatch|LatencyInfo|InputLatency|Gesture|Touch|Mouse|Pointer)/],
  ].map(([label, pattern]) => {
    const matched = complete.filter(event => pattern.test(event.name));
    const dur = matched.reduce((sum, event) => sum + event.dur, 0);
    return { label, count: matched.length, dur };
  });

  const longEvents = complete
    .filter(event => event.dur >= 8000)
    .sort((a, b) => b.dur - a.dur)
    .slice(0, 20);

  const inputDispatches = complete
    .filter(event => event.name === "EventDispatch")
    .map(event => ({
      type: event.args?.data?.type || "unknown",
      dur: event.dur,
    }));
  const inputTypes = new Map();
  for (const item of inputDispatches) {
    const prev = inputTypes.get(item.type) || { count: 0, dur: 0, max: 0 };
    prev.count += 1;
    prev.dur += item.dur;
    prev.max = Math.max(prev.max, item.dur);
    inputTypes.set(item.type, prev);
  }

  const lines = [];
  lines.push("# Android WebView Trace Summary");
  lines.push("");
  lines.push(`- 时间：${meta.startedAt}`);
  lines.push(`- 包名：${meta.packageName}`);
  lines.push(`- 设备：${meta.device}`);
  lines.push(`- Target：${meta.targetTitle || "(untitled)"}`);
  lines.push(`- URL：${meta.targetUrl || "(unknown)"}`);
  lines.push(`- 诊断轻量模式：${meta.diagnosticLite ? "开启" : "关闭"}`);
  lines.push(`- 录制时长：${wallDuration == null ? "(unknown)" : `${wallDuration.toFixed(2)}s`}`);
  lines.push(`- 输入事件跨度：${(inputRangeUs / 1_000_000).toFixed(2)}s`);
  lines.push(`- Trace events：${events.length}`);
  lines.push("");
  lines.push("## 热区汇总");
  lines.push("");
  lines.push("| 类型 | 次数 | 总耗时 | 占 complete events |");
  lines.push("|---|---:|---:|---:|");
  for (const group of groups) {
    const ratio = totalDur > 0 ? `${((group.dur / totalDur) * 100).toFixed(1)}%` : "0.0%";
    lines.push(`| ${group.label} | ${group.count} | ${formatMs(group.dur)} | ${ratio} |`);
  }
  lines.push("");

  if (inputTypes.size) {
    lines.push("## 输入事件");
    lines.push("");
    lines.push("| 事件 | 次数 | 总耗时 | 单次最高 |");
    lines.push("|---|---:|---:|---:|");
    [...inputTypes.entries()]
      .sort((a, b) => b[1].dur - a[1].dur)
      .slice(0, 12)
      .forEach(([type, data]) => {
        lines.push(`| ${type} | ${data.count} | ${formatMs(data.dur)} | ${formatMs(data.max)} |`);
      });
    lines.push("");
  }

  lines.push("## 最慢事件");
  lines.push("");
  if (longEvents.length) {
    lines.push("| 名称 | 耗时 | 类别 |");
    lines.push("|---|---:|---|");
    for (const event of longEvents) {
      lines.push(`| ${event.name} | ${formatMs(event.dur)} | ${event.cat || ""} |`);
    }
  } else {
    lines.push("没有发现超过 8ms 的 complete event。");
  }
  lines.push("");
  lines.push("## 粗判读");
  lines.push("");
  lines.push("- Paint 明显高：优先看阴影、伪元素、遮罩、大面积重绘。");
  lines.push("- Layout 明显高：优先看拖拽期间是否有布局读写互相穿插。");
  lines.push("- Script 明显高：优先看 pointer/touch 事件处理和浮层判断。");
  lines.push("- 三者都低但体感仍差：更可能是合成、刷新率、WebView 输入调度或动画曲线问题。");
  lines.push("");
  lines.push("完整 JSON 可以拖进 Chrome DevTools Performance 面板继续看帧条和 Main 线程。");
  return lines.join("\n");
}

async function recordTrace(client, options) {
  const events = [];
  let completeResolve;
  const complete = new Promise(resolve => { completeResolve = resolve; });

  client.on("Tracing.dataCollected", params => {
    if (Array.isArray(params.value)) events.push(...params.value);
  });
  client.on("Tracing.tracingComplete", completeResolve);

  if (options.diagnosticLite) {
    await client.send("Runtime.evaluate", {
      expression: "document.documentElement.classList.add('perf-diagnostics-lite')",
      awaitPromise: false,
    });
  } else {
    await client.send("Runtime.evaluate", {
      expression: "document.documentElement.classList.remove('perf-diagnostics-lite')",
      awaitPromise: false,
    });
  }

  const startedAt = new Date();
  await client.send("Tracing.start", {
    categories: TRACE_CATEGORIES,
    transferMode: "ReportEvents",
    options: "sampling-frequency=10000",
  });

  if (options.manual) {
    const rl = readline.createInterface({ input, output });
    await rl.question("录制中。现在操作侧栏/面板，完成后按回车停止...");
    rl.close();
  } else {
    console.log(`录制中：${options.seconds}s。现在操作侧栏/面板...`);
    await sleep(options.seconds * 1000);
  }

  await client.send("Tracing.end");
  await complete;
  const endedAt = new Date();
  return {
    events,
    startedAt,
    endedAt,
    durationSeconds: (endedAt.getTime() - startedAt.getTime()) / 1000,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    return;
  }

  const packageName = args.packageName || await readDefaultPackageName();
  if (!packageName) throw new Error("无法从 capacitor.config.json 读取 appId，请用 --package 指定包名。");

  const adbPath = await findAdb();
  const device = await ensureSingleDevice(adbPath, args.device);

  if (args.launch) {
    console.log(`启动 App：${packageName}`);
    await launchApp(adbPath, device, packageName);
  }

  const pid = await waitForPid(adbPath, device, packageName);
  const socketName = await findWebViewSocket(adbPath, device, pid);
  const port = await forwardWebView(adbPath, device, socketName, args.port);
  const target = await findTarget(port, args.target);

  console.log(`已连接 WebView：${target.title || "(untitled)"}`);
  console.log(args.manual ? "按提示操作。" : "3 秒后开始录制，请把手放到要操作的位置。");
  if (!args.manual) await sleep(3000);

  const client = new CdpClient(target.webSocketDebuggerUrl);
  await client.connect();

  const recording = await recordTrace(client, args);
  client.close();

  const stamp = timestampForFile(recording.startedAt);
  const outDir = path.resolve(args.outDir, stamp);
  await fs.mkdir(outDir, { recursive: true });

  const meta = {
    generatedBy: "scripts/android-trace.mjs",
    startedAt: recording.startedAt.toISOString(),
    endedAt: recording.endedAt.toISOString(),
    durationSeconds: recording.durationSeconds,
    diagnosticLite: args.diagnosticLite,
    packageName,
    device,
    pid,
    socketName,
    port,
    targetTitle: target.title,
    targetUrl: target.url,
  };
  const trace = {
    traceEvents: recording.events,
    metadata: meta,
  };

  const jsonPath = path.join(outDir, "trace.json");
  const summaryPath = path.join(outDir, "summary.md");
  await fs.writeFile(jsonPath, JSON.stringify(trace), "utf8");
  await fs.writeFile(summaryPath, summarizeEvents(recording.events, meta), "utf8");

  console.log("");
  console.log("完成。生成文件：");
  console.log(`- ${summaryPath}`);
  console.log(`- ${jsonPath}`);
}

main().catch(error => {
  console.error("");
  console.error(`失败：${error.message}`);
  if (error.stderr) console.error(String(error.stderr).trim());
  process.exitCode = 1;
});
