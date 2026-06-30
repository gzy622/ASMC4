import { closeScoreSheet } from "../score-sheet/index.js";
import { addButton, newAssignmentPanel, newAssignmentInput, newAssignmentSubjectInput, quickPanel, quickRenameInput } from "../dom-refs.js";
import { closeConfirm } from "./confirm.js";
import { closeDrawer } from "./drawer.js";
import { renderQuickPanel } from "../render/quickPanel.js";
import { makeDefaultAssignmentTitle } from "../utils/id.js";

export function openNewAssignmentPanel() {
  closeScoreSheet();
  closeDrawer();
  closeAllCenterPanels({ restoreFocus: false });

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

export function closeAllCenterPanels({ restoreFocus = true } = {}) {
  const wasNewAssignmentPanelOpen = newAssignmentPanel.classList.contains("is-open");

  blurCenterPanelFocus();
  closeScoreSheet();

  quickPanel.classList.remove("is-open");
  quickPanel.setAttribute("aria-hidden", "true");

  newAssignmentPanel.classList.remove("is-open");
  newAssignmentPanel.setAttribute("aria-hidden", "true");

  closeConfirm();

  if (restoreFocus && wasNewAssignmentPanelOpen) {
    requestAnimationFrame(() => addButton.focus());
  }
}

export function openQuickPanel({ focusName = false } = {}) {
  closeScoreSheet();
  closeDrawer();
  closeAllCenterPanels({ restoreFocus: false });
  renderQuickPanel();

  quickPanel.classList.add("is-open");
  quickPanel.setAttribute("aria-hidden", "false");

  if (focusName) {
    requestAnimationFrame(() => quickRenameInput?.focus());
  }
}

export function commitQuickPanelOpen() {
  quickPanel.classList.add("is-open");
  quickPanel.setAttribute("aria-hidden", "false");
}
