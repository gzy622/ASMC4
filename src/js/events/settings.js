import {
  settingsBtn,
  settingsCloseButton,
  scoringModeSwitch,
  scoreTensModeSwitch,
  showBarScoringToggleSwitch,
  showBarStatsSwitch,
  settingsExportBtn,
  settingsImportBtn,
  settingsRosterBtn,
  importBackupInput,
  settingsPanel,
  rosterEditorPanel
} from "../dom-refs.js";
import { getState, saveAppState } from "../state.js";
import { setScoreTensMode } from "../runtime.js";
import { toggleScoringMode } from "../business/student.js";
import { openSettings, closeSettings } from "../ui/settings.js";
import { renderRosterRows } from "../ui/roster.js";
import { swapOverlay } from "../ui/overlay.js";
import { announce } from "../utils/dom.js";
import { render } from "../render/index.js";

export function bindSettingsEvents() {
  settingsBtn.addEventListener("click", openSettings);
  settingsCloseButton.addEventListener("click", closeSettings);

  scoringModeSwitch.addEventListener("click", toggleScoringMode);

  showBarScoringToggleSwitch?.addEventListener("click", () => {
    const state = getState();
    state.showBarScoringToggle = !(state.showBarScoringToggle !== false);
    saveAppState();
    render();
    announce(state.showBarScoringToggle ? "已显示顶栏打分按钮" : "已隐藏顶栏打分按钮");
  });

  showBarStatsSwitch?.addEventListener("click", () => {
    const state = getState();
    state.showBarStats = !(state.showBarStats !== false);
    saveAppState();
    render();
    announce(state.showBarStats !== false ? "已显示顶栏已交人数" : "已隐藏顶栏已交人数");
  });

  scoreTensModeSwitch.addEventListener("click", () => {
    const state = getState();
    state.scoreTensMode = !state.scoreTensMode;
    setScoreTensMode(state.scoreTensMode);
    saveAppState();
    render();
    announce(state.scoreTensMode ? "已开启×10模式" : "已关闭×10模式");
  });

  settingsExportBtn.addEventListener("click", async () => {
    const { exportBackup } = await import("../ui/backup.js");
    exportBackup();
  });

  settingsImportBtn.addEventListener("click", () => importBackupInput.click());

  settingsRosterBtn.addEventListener("click", () => {
    const state = getState();
    swapOverlay(settingsPanel, rosterEditorPanel, () => renderRosterRows(state.roster));
  });
}