import { closeScoreSheet } from "../score-sheet/index.js";
import { newAssignmentPanel, newAssignmentInput, newAssignmentSubjectInput, quickPanel } from "../dom-refs.js";
import { getState } from "../state.js";
import { closeConfirm } from "./confirm.js";
import { closeDrawer } from "./drawer.js";
import { renderQuickAssignmentList } from "../render/quickPanel.js";

export function openNewAssignmentPanel() {
  closeScoreSheet();
  closeDrawer();
  closeAllCenterPanels();

  quickPanel.classList.remove("is-open");
  quickPanel.setAttribute("aria-hidden", "true");

  newAssignmentInput.value = "";
  if (newAssignmentSubjectInput) newAssignmentSubjectInput.value = "英语";
  newAssignmentPanel.classList.add("is-open");
  newAssignmentPanel.setAttribute("aria-hidden", "false");

  requestAnimationFrame(() => {
    newAssignmentInput.focus();
  });
}

export function closeAllCenterPanels() {
  closeScoreSheet();

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
  renderQuickAssignmentList(getState());

  quickPanel.classList.add("is-open");
  quickPanel.setAttribute("aria-hidden", "false");
}

export function commitQuickPanelOpen() {
  quickPanel.classList.add("is-open");
  quickPanel.setAttribute("aria-hidden", "false");
}
