import { closeScoreSheet } from "../score-sheet/index.js";
import { newAssignmentPanel, newAssignmentInput, newAssignmentSubjectInput, quickPanel, quickRenameInput, titleButton } from "../dom-refs.js";
import { closeConfirm } from "./confirm.js";
import { closeDrawer } from "./drawer.js";
import { renderQuickPanel } from "../render/quickPanel.js";
import { makeDefaultAssignmentTitle } from "../utils/id.js";

export function openNewAssignmentPanel() {
  closeScoreSheet();
  closeDrawer();
  closeAllCenterPanels();

  quickPanel.classList.remove("is-open");
  quickPanel.setAttribute("aria-hidden", "true");

  newAssignmentInput.value = makeDefaultAssignmentTitle();
  if (newAssignmentSubjectInput) newAssignmentSubjectInput.value = "英语";
  newAssignmentPanel.classList.add("is-open");
  newAssignmentPanel.setAttribute("aria-hidden", "false");

  requestAnimationFrame(() => {
    newAssignmentInput.focus();
  });
}

function blurCenterPanelFocus() {
  const active = document.activeElement;
  if (active && (newAssignmentPanel.contains(active) || quickPanel.contains(active))) {
    active.blur();
  }
}

export function closeAllCenterPanels() {
  blurCenterPanelFocus();
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
  renderQuickPanel();

  quickPanel.classList.add("is-open");
  quickPanel.setAttribute("aria-hidden", "false");

  requestAnimationFrame(() => {
    if (document.activeElement === titleButton && quickRenameInput) {
      quickRenameInput.focus();
    }
  });
}

export function commitQuickPanelOpen() {
  quickPanel.classList.add("is-open");
  quickPanel.setAttribute("aria-hidden", "false");
}
