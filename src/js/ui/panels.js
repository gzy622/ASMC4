import { closeScoreSheet } from "../score-sheet/index.js";
import { modalScrim, newAssignmentPanel, newAssignmentInput, quickPanel } from "../dom-refs.js";
import { closeConfirm } from "./confirm.js";
import { closeDrawer } from "./drawer.js";

export function openNewAssignmentPanel() {
  closeScoreSheet();
  closeDrawer();
  closeAllCenterPanels();

  newAssignmentInput.value = "";
  modalScrim.classList.add("is-open");
  newAssignmentPanel.classList.add("is-open");
  newAssignmentPanel.setAttribute("aria-hidden", "false");

  requestAnimationFrame(() => {
    newAssignmentInput.focus();
  });
}

export function closeAllCenterPanels() {
  closeScoreSheet();
  modalScrim.classList.remove("is-open");

  quickPanel.classList.remove("is-open");
  quickPanel.setAttribute("aria-hidden", "true");

  newAssignmentPanel.classList.remove("is-open");
  newAssignmentPanel.setAttribute("aria-hidden", "true");

  closeConfirm();
}

export function openQuickPanel() {
  closeScoreSheet();
  closeDrawer();
  closeAllCenterPanels();

  modalScrim.classList.add("is-open");
  quickPanel.classList.add("is-open");
  quickPanel.setAttribute("aria-hidden", "false");
}
