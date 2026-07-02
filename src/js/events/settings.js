import {
  settingsBtn,
  settingsCloseButton,
  scoringModeSwitch,
  scoreTensModeSwitch,
  showBarScoringToggleSwitch,
  showBarStatsSwitch,
  hapticsEnabledSwitch,
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
import { swapDrawerFullscreenPanel } from "../ui/drawer-fullscreen.js";
import { announce } from "../utils/dom.js";
import { hapticSelection } from "../utils/haptics.js";
import { render } from "../render/index.js";

export function bindSettingsEvents() {
  settingsBtn.addEventListener("click", openSettings);
  settingsCloseButton.addEventListener("click", closeSettings);

  scoringModeSwitch.addEventListener("click", toggleScoringMode);

  showBarScoringToggleSwitch?.addEventListener("click", () => {
    hapticSelection();
    const state = getState();
    state.showBarScoringToggle = !(state.showBarScoringToggle !== false);
    saveAppState({ history: false });
    render();
    announce(state.showBarScoringToggle ? "顶栏按钮已显示" : "顶栏按钮已隐藏");
  });

  showBarStatsSwitch?.addEventListener("click", () => {
    hapticSelection();
    const state = getState();
    state.showBarStats = !(state.showBarStats !== false);
    saveAppState({ history: false });
    render();
    announce(state.showBarStats !== false ? "已交人数已显示" : "已交人数已隐藏");
  });

  scoreTensModeSwitch.addEventListener("click", () => {
    hapticSelection();
    const state = getState();
    state.scoreTensMode = !state.scoreTensMode;
    setScoreTensMode(state.scoreTensMode);
    saveAppState({ history: false });
    render();
    announce(state.scoreTensMode ? "×10 已开启" : "×10 已关闭");
  });

  hapticsEnabledSwitch?.addEventListener("click", () => {
    hapticSelection();
    const state = getState();
    state.hapticsEnabled = !(state.hapticsEnabled !== false);
    saveAppState({ history: false });
    render();
    announce(state.hapticsEnabled !== false ? "振动反馈已开启" : "振动反馈已关闭");
  });

  settingsExportBtn.addEventListener("click", async () => {
    const { exportBackup } = await import("../ui/backup.js");
    exportBackup();
  });

  settingsImportBtn.addEventListener("click", () => importBackupInput.click());

  settingsRosterBtn.addEventListener("click", () => {
    const state = getState();
    swapDrawerFullscreenPanel(settingsPanel, rosterEditorPanel, () => renderRosterRows(state.roster));
  });
}
