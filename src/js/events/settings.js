import {
  settingsBtn,
  settingsCloseButton,
  scoringModeSwitch,
  scoreStep10ModeSwitch,
  showBarScoringToggleSwitch,
  showBarStatsSwitch,
  hapticsEnabledSwitch,
  settingsExportBtn,
  settingsImportBtn,
  settingsRosterBtn,
  settingsPanel,
  rosterEditorPanel,
  traceEnabledSwitch,
  traceExportBtn,
  traceClearBtn
} from "../dom-refs.js";
import { getState, saveAppState } from "../state.js";
import { setScoreStep10Mode } from "../runtime.js";
import { toggleScoringMode } from "../business/student.js";
import { openSettings, closeSettings } from "../ui/settings.js";
import { openImportBackupPicker } from "../ui/backup.js";
import { renderRosterRows } from "../ui/roster.js";
import { swapDrawerFullscreenPanel } from "../ui/drawer-fullscreen.js";
import { announce } from "../utils/dom.js";
import { hapticSelection } from "../utils/haptics.js";
import { scheduleRender } from "../render/index.js";
import { isTraceEnabled, setTraceEnabled, traceEvent } from "../utils/trace.js";

export function bindSettingsEvents() {
  settingsBtn.addEventListener("click", () => {
    traceEvent("settings.open");
    openSettings();
  });
  settingsCloseButton.addEventListener("click", () => {
    traceEvent("settings.close");
    closeSettings();
  });

  scoringModeSwitch.addEventListener("click", toggleScoringMode);

  showBarScoringToggleSwitch?.addEventListener("click", () => {
    traceEvent("settings.showBarScoringToggle");
    hapticSelection();
    const state = getState();
    state.showBarScoringToggle = !(state.showBarScoringToggle !== false);
    saveAppState({ history: false });
    scheduleRender();
    announce(state.showBarScoringToggle ? "顶栏按钮已显示" : "顶栏按钮已隐藏");
  });

  showBarStatsSwitch?.addEventListener("click", () => {
    traceEvent("settings.showBarStats");
    hapticSelection();
    const state = getState();
    state.showBarStats = !(state.showBarStats !== false);
    saveAppState({ history: false });
    scheduleRender();
    announce(state.showBarStats !== false ? "已交人数已显示" : "已交人数已隐藏");
  });

  scoreStep10ModeSwitch.addEventListener("click", () => {
    traceEvent("settings.scoreStep10Mode");
    hapticSelection();
    const state = getState();
    state.scoreStep10Mode = !state.scoreStep10Mode;
    setScoreStep10Mode(state.scoreStep10Mode);
    saveAppState({ history: false });
    scheduleRender();
    announce(state.scoreStep10Mode ? "×10 已开启" : "×10 已关闭");
  });

  hapticsEnabledSwitch?.addEventListener("click", () => {
    traceEvent("settings.haptics");
    hapticSelection();
    const state = getState();
    state.hapticsEnabled = !(state.hapticsEnabled !== false);
    saveAppState({ history: false });
    scheduleRender();
    announce(state.hapticsEnabled !== false ? "振动反馈已开启" : "振动反馈已关闭");
  });

  settingsExportBtn.addEventListener("click", async () => {
    traceEvent("backup.export");
    const { exportBackup } = await import("../ui/backup.js");
    exportBackup();
  });

  settingsImportBtn.addEventListener("click", () => {
    traceEvent("backup.import.pick");
    openImportBackupPicker();
  });

  settingsRosterBtn.addEventListener("click", () => {
    traceEvent("settings.roster.open");
    const state = getState();
    swapDrawerFullscreenPanel(settingsPanel, rosterEditorPanel, () => renderRosterRows(state.roster));
  });

  traceEnabledSwitch?.addEventListener("click", () => {
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
  });

  traceExportBtn?.addEventListener("click", async () => {
    traceEvent("trace.export");
    const { exportTrace } = await import("../ui/trace.js");
    exportTrace();
  });

  traceClearBtn?.addEventListener("click", async () => {
    traceEvent("trace.clear");
    const { clearTraceWithConfirm } = await import("../ui/trace.js");
    clearTraceWithConfirm();
  });
}
