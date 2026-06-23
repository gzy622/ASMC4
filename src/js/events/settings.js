import {
  settingsBtn,
  settingsCloseButton,
  scoringModeSwitch,
  scoreTensModeSwitch,
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
import { exportBackup } from "../ui/backup.js";
import { openSettings, closeSettings } from "../ui/settings.js";
import { renderRosterRows } from "../ui/roster.js";
import { swapOverlay } from "../ui/overlay.js";
import { announce } from "../utils/dom.js";
import { render } from "../render/index.js";

export function bindSettingsEvents() {
  settingsBtn.addEventListener("click", openSettings);
  settingsCloseButton.addEventListener("click", closeSettings);

  scoringModeSwitch.addEventListener("click", toggleScoringMode);

  scoreTensModeSwitch.addEventListener("click", () => {
    const state = getState();
    state.scoreTensMode = !state.scoreTensMode;
    setScoreTensMode(state.scoreTensMode);
    saveAppState();
    render();
    announce(state.scoreTensMode ? "已开启×10模式" : "已关闭×10模式");
  });

  settingsExportBtn.addEventListener("click", exportBackup);

  settingsImportBtn.addEventListener("click", () => importBackupInput.click());

  settingsRosterBtn.addEventListener("click", () => {
    const state = getState();
    swapOverlay(settingsPanel, rosterEditorPanel, () => renderRosterRows(state.roster));
  });
}