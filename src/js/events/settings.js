import {
  settingsBtn,
  settingsCloseButton,
  scoringModeSwitch,
  instantScoringModeSwitch,
  scoreStep10ModeSwitch,
  showBarScoringToggleSwitch,
  showBarStatsSwitch,
  hapticsEnabledSwitch,
  showRealNameSwitch,
  quickShowRealNameSwitch,
  quickScoringModeSwitch,
  quickInstantScoringModeSwitch,
  settingsExportBtn,
  settingsImportBtn,
  settingsRosterBtn,
  settingsPanel,
  rosterEditorPanel,
  traceEnabledSwitch,
  traceExportBtn,
  traceClearBtn
} from "../dom-refs.js";
import { getState } from "../state.js";
import {
  toggleScoringMode,
  toggleInstantScoringMode,
  toggleShowBarScoringToggle,
  toggleShowBarStats,
  toggleScoreStep10Mode,
  toggleHapticsEnabled,
  toggleShowRealNames,
  toggleTraceEnabled
} from "../business/settings.js";
import { bindSettingSwitch } from "../ui/switch-bind.js";
import { openSettings, closeSettings } from "../ui/settings.js";
import { openImportBackupPicker } from "../ui/backup.js";
import { renderRosterRows } from "../ui/roster.js";
import { swapDrawerFullscreenPanel } from "../ui/drawer-fullscreen.js";
import { traceEvent } from "../utils/trace.js";

export function bindSettingsEvents() {
  settingsBtn.addEventListener("click", () => {
    traceEvent("settings.open");
    openSettings();
  });
  settingsCloseButton.addEventListener("click", () => {
    traceEvent("settings.close");
    closeSettings();
  });

  bindSettingSwitch(scoringModeSwitch, toggleScoringMode);
  bindSettingSwitch(instantScoringModeSwitch, toggleInstantScoringMode);
  bindSettingSwitch(showBarScoringToggleSwitch, toggleShowBarScoringToggle);
  bindSettingSwitch(showBarStatsSwitch, toggleShowBarStats);
  bindSettingSwitch(scoreStep10ModeSwitch, toggleScoreStep10Mode);
  bindSettingSwitch(hapticsEnabledSwitch, toggleHapticsEnabled);
  bindSettingSwitch(showRealNameSwitch, toggleShowRealNames);
  bindSettingSwitch(quickShowRealNameSwitch, toggleShowRealNames);
  bindSettingSwitch(quickScoringModeSwitch, toggleScoringMode);
  bindSettingSwitch(quickInstantScoringModeSwitch, toggleInstantScoringMode);
  bindSettingSwitch(traceEnabledSwitch, toggleTraceEnabled);

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
