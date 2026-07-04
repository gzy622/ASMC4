import {
  confirmScrim,
  scoreSheet,
  rosterEditorPanel,
  settingsPanel,
  quickPanel,
  newAssignmentPanel,
  drawer
} from "../dom-refs.js";
import { closeConfirm } from "./confirm.js";
import { closeScoreSheet } from "../score-sheet/index.js";
import { closeRosterEditor } from "./roster.js";
import { closeSettings } from "./settings.js";
import { closeFloatingPanels } from "./panels.js";
import { closeDrawer } from "./drawer.js";

export const FLOATING_LAYER_ELS = [
  confirmScrim,
  scoreSheet,
  rosterEditorPanel,
  settingsPanel,
  quickPanel,
  newAssignmentPanel,
  drawer
];

export function anyFloatingLayerOpen() {
  return FLOATING_LAYER_ELS.some(el => el?.classList.contains("is-open"));
}

export function closeTopmostFloatingLayer() {
  if (confirmScrim.classList.contains("is-open")) {
    closeConfirm();
    return true;
  }
  if (scoreSheet.classList.contains("is-open")) {
    closeScoreSheet();
    return true;
  }
  if (rosterEditorPanel.classList.contains("is-open")) {
    closeRosterEditor();
    return true;
  }
  if (settingsPanel.classList.contains("is-open")) {
    closeSettings();
    return true;
  }
  if (newAssignmentPanel.classList.contains("is-open") || quickPanel.classList.contains("is-open")) {
    closeFloatingPanels();
    return true;
  }
  if (drawer.classList.contains("is-open")) {
    closeDrawer();
    return true;
  }
  return false;
}
