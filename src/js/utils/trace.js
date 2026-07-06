import { BUILD_TIMESTAMP } from "../build-version.js";

const TRACE_CONFIG_KEY = "asmc4_trace_config_v1";
const MAX_ENTRIES = 800;

let enabled = null;
let seq = 0;
const buffer = [];
let runtimeSnapshotProvider = null;

function loadEnabled() {
  if (enabled !== null) return enabled;
  try {
    const raw = localStorage.getItem(TRACE_CONFIG_KEY);
    enabled = raw ? JSON.parse(raw).enabled === true : false;
  } catch {
    enabled = false;
  }
  return enabled;
}

export function isTraceEnabled() {
  return loadEnabled();
}

export function setTraceEnabled(value) {
  enabled = Boolean(value);
  try {
    localStorage.setItem(TRACE_CONFIG_KEY, JSON.stringify({ enabled }));
  } catch {
    /* ignore quota errors */
  }
}

export function setTraceRuntimeSnapshotProvider(fn) {
  runtimeSnapshotProvider = fn;
}

function maybeSnapshot(data) {
  if (!runtimeSnapshotProvider) return data;
  const snap = runtimeSnapshotProvider();
  if (!snap) return data;
  if (data == null) return { _runtime: snap };
  return Object.assign({}, data, { _runtime: snap });
}

function pushEntry(kind, name, data) {
  const entry = { ts: Date.now(), seq: ++seq, kind, name };
  if (data !== undefined) entry.data = data;
  buffer.push(entry);
  if (buffer.length > MAX_ENTRIES) buffer.shift();
}

export function traceEvent(name, data) {
  if (!loadEnabled()) return;
  pushEntry("event", name, data);
}

export function traceStep(name, data) {
  if (!loadEnabled()) return;
  pushEntry("step", name, maybeSnapshot(data));
}

export function traceGesture(name, phase, data) {
  if (!loadEnabled()) return;
  const payload = data != null ? Object.assign({ phase }, data) : { phase };
  pushEntry("gesture", name, payload);
}

export function getTraceEntries() {
  return buffer.slice();
}

export function clearTrace() {
  buffer.length = 0;
  seq = 0;
}

export function exportTraceJson() {
  return JSON.stringify({
    exportedAt: new Date().toISOString(),
    buildTimestamp: BUILD_TIMESTAMP,
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
    enabled: isTraceEnabled(),
    entries: getTraceEntries()
  }, null, 2);
}

/** 仅供 adb 调试脚本经 CDP 调用，勿在业务 UI 中引用。 */
export function createDebugTraceApi() {
  return {
    clear() {
      clearTrace();
      setTraceEnabled(true);
    },
    enable() {
      setTraceEnabled(true);
    },
    disable() {
      setTraceEnabled(false);
    },
    exportJson() {
      return exportTraceJson();
    },
    getEntryCount() {
      return buffer.length;
    },
    isEnabled() {
      return isTraceEnabled();
    }
  };
}
