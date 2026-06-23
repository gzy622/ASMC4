import { settingsPanel } from "../dom-refs.js";
import { closeScoreSheet } from "../score-sheet/index.js";
import { closeAllCenterPanels } from "./panels.js";
import { closeDrawer } from "./drawer.js";
import { renderSettingsState } from "../render/settings.js";
import { getState } from "../state.js";

export function openSettings() {
  closeScoreSheet();
  closeDrawer();
  closeAllCenterPanels();

  renderSettingsState(getState());

  settingsPanel.classList.add("is-open");
  settingsPanel.setAttribute("aria-hidden", "false");
}

export function closeSettings() {
  settingsPanel.classList.remove("is-open");
  settingsPanel.setAttribute("aria-hidden", "true");
}