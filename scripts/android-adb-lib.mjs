import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";

export const DEFAULT_PORT = 9229;

export const TRACE_CATEGORIES = [
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

export function execFileText(file, args, options = {}) {
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

export async function readDefaultPackageName() {
  try {
    const raw = await fs.readFile("capacitor.config.json", "utf8");
    const config = JSON.parse(raw);
    return config.appId || null;
  } catch {
    return null;
  }
}

export async function findAdb() {
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

export function adbArgs(args, device) {
  return device ? ["-s", device, ...args] : args;
}

export async function adb(adbPath, args, device) {
  return execFileText(adbPath, adbArgs(args, device));
}

export async function ensureSingleDevice(adbPath, device) {
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
    throw new Error("没有发现已连接并授权的 Android 设备（USB 或无线 adb 均可）。");
  }
  if (devices.length > 1) {
    throw new Error(`发现多台设备，请加 --device 指定其中一台：${devices.join(", ")}`);
  }
  return devices[0];
}

export async function sleep(ms) {
  await new Promise(resolve => setTimeout(resolve, ms));
}

export async function getPid(adbPath, device, packageName) {
  const raw = await adb(adbPath, ["shell", "pidof", packageName], device).catch(() => "");
  const pid = raw.trim().split(/\s+/)[0];
  return pid || null;
}

export async function launchApp(adbPath, device, packageName) {
  await adb(adbPath, ["shell", "monkey", "-p", packageName, "1"], device);
}

export async function waitForPid(adbPath, device, packageName) {
  for (let i = 0; i < 20; i += 1) {
    const pid = await getPid(adbPath, device, packageName);
    if (pid) return pid;
    await sleep(250);
  }
  throw new Error(`App 未运行，无法找到进程：${packageName}`);
}

export async function findWebViewSocket(adbPath, device, pid) {
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

export async function forwardWebView(adbPath, device, socketName, startPort) {
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

export async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url} 返回 ${response.status}`);
  return response.json();
}

export async function findTarget(port, query) {
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

export class CdpClient {
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

export function timestampForFile(date = new Date()) {
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

export async function connectWebView({
  adbPath,
  device,
  packageName,
  launch = true,
  port = DEFAULT_PORT,
  targetQuery = null,
}) {
  if (launch) {
    console.log(`启动 App：${packageName}`);
    await launchApp(adbPath, device, packageName);
  }

  const pid = await waitForPid(adbPath, device, packageName);
  const socketName = await findWebViewSocket(adbPath, device, pid);
  const forwardPort = await forwardWebView(adbPath, device, socketName, port);
  const target = await findTarget(forwardPort, targetQuery);

  return {
    pid,
    socketName,
    port: forwardPort,
    target,
  };
}
