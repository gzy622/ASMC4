import { getState, saveAppState } from "../state.js";
import { scheduleRender } from "../render/index.js";
import { syncScoreStep10Ui } from "../score-sheet/score-step10-ui.js";
import { announce } from "../utils/dom.js";
import { hapticSelection } from "../utils/haptics.js";
import { traceEvent, traceStep, isTraceEnabled, setTraceEnabled } from "../utils/trace.js";

export function setScoreStep10ModeEnabled(enabled, { renderMode = "full" } = {}) {
  const state = getState();
  if (state.scoreStep10Mode === enabled) return;
  state.scoreStep10Mode = enabled;
  saveAppState({ history: false });
  if (renderMode === "sheet") syncScoreStep10Ui(enabled);
  else scheduleRender();
}

export function toggleShowBarScoringToggle() {
  traceEvent("settings.showBarScoringToggle");
  hapticSelection();
  const state = getState();
  state.showBarScoringToggle = !(state.showBarScoringToggle !== false);
  saveAppState({ history: false });
  scheduleRender();
  announce(state.showBarScoringToggle ? "顶栏按钮已显示" : "顶栏按钮已隐藏");
}

export function toggleShowBarStats() {
  traceEvent("settings.showBarStats");
  hapticSelection();
  const state = getState();
  state.showBarStats = !(state.showBarStats !== false);
  saveAppState({ history: false });
  scheduleRender();
  announce(state.showBarStats !== false ? "已交人数已显示" : "已交人数已隐藏");
}

export function toggleInstantScoringMode() {
  traceEvent("settings.instantScoringMode");
  hapticSelection();
  const state = getState();
  state.instantScoringMode = !state.instantScoringMode;
  saveAppState({ history: false });
  scheduleRender();
  announce(state.instantScoringMode ? "即时打分已开启" : "即时打分已关闭");
}

export function toggleScoreStep10Mode() {
  traceEvent("settings.scoreStep10Mode");
  hapticSelection();
  const state = getState();
  setScoreStep10ModeEnabled(!state.scoreStep10Mode);
  announce(state.scoreStep10Mode ? "×10 已开启" : "×10 已关闭");
}

export function toggleScoreStep10ModeFromSheet() {
  traceEvent("score.step10Mode");
  const state = getState();
  setScoreStep10ModeEnabled(!state.scoreStep10Mode, { renderMode: "sheet" });
}

export function toggleHapticsEnabled() {
  traceEvent("settings.haptics");
  hapticSelection();
  const state = getState();
  state.hapticsEnabled = !(state.hapticsEnabled !== false);
  saveAppState({ history: false });
  scheduleRender();
  announce(state.hapticsEnabled !== false ? "振动反馈已开启" : "振动反馈已关闭");
}

export function toggleShowRealNames() {
  traceEvent("student.showRealNames.toggle");
  hapticSelection();
  const state = getState();
  state.showRealNames = !state.showRealNames;
  saveAppState({ history: false });
  scheduleRender();
  announce(state.showRealNames ? "已显示姓名" : "已隐藏姓名");
}

export function toggleScoringMode() {
  traceStep("toggleScoringMode", { to: !getState().scoringMode });
  hapticSelection();
  const state = getState();
  state.scoringMode = !state.scoringMode;
  saveAppState({ history: false });
  scheduleRender();
  announce(state.scoringMode ? "打分模式已开启" : "打分模式已关闭");
}

export function toggleTraceEnabled() {
  const next = !isTraceEnabled();
  if (next) {
    setTraceEnabled(true);
    traceEvent("trace.enabled", { enabled: true });
  } else {
    traceEvent("trace.enabled", { enabled: false });
    setTraceEnabled(false);
  }
  scheduleRender();
  announce(next ? "操作日志已开启" : "操作日志已关闭");
}
