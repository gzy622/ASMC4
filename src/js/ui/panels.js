import { closeScoreSheet } from "../score-sheet/index.js";
import { addButton, newAssignmentPanel, newAssignmentTitleInput, newAssignmentSubjectInput, quickPanel, quickRenameInput } from "../dom-refs.js";
import { closeConfirm } from "./confirm.js";
import { closeDrawer } from "./drawer.js";
import { refreshQuickPanelContent } from "../render/quickPanel.js";
import { makeDefaultAssignmentTitle } from "../utils/id.js";
import { resetQuickPanelView, restoreQuickPanelViewFromPreference, shouldShowQuickPanelHistoryContent } from "./history.js";
import { beginShadowRevealAfterOpen, cancelShadowReveal } from "./shadow-reveal.js";

let abortQuickPanelOpenDrag = () => {};

export function registerQuickPanelOpenDragAbort(fn) {
  abortQuickPanelOpenDrag = fn;
}

function teardownQuickPanelDrag() {
  abortQuickPanelOpenDrag();
  quickPanel.classList.remove("is-dragging");
}

export function openNewAssignmentPanel() {
  closeScoreSheet();
  closeDrawer();
  closeFloatingPanels({ restoreFocus: false });

  quickPanel.classList.remove("is-open");
  quickPanel.setAttribute("aria-hidden", "true");

  newAssignmentTitleInput.value = makeDefaultAssignmentTitle();
  if (newAssignmentSubjectInput) newAssignmentSubjectInput.value = "英语";
  newAssignmentPanel.classList.add("is-open");
  newAssignmentPanel.setAttribute("aria-hidden", "false");
  beginShadowRevealAfterOpen(newAssignmentPanel, {
    onSettled: () => {
      if (newAssignmentPanel.classList.contains("is-open")) {
        newAssignmentTitleInput.focus();
      }
    },
  });
}

function blurTopSheetFocus() {
  const active = document.activeElement;
  if (active && (newAssignmentPanel.contains(active) || quickPanel.contains(active))) {
    active.blur();
  }
}

export function closeFloatingPanels({ restoreFocus = true } = {}) {
  const wasNewAssignmentPanelOpen = newAssignmentPanel.classList.contains("is-open");

  blurTopSheetFocus();
  closeScoreSheet();
  teardownQuickPanelDrag();
  resetQuickPanelView();
  cancelShadowReveal(quickPanel);
  cancelShadowReveal(newAssignmentPanel);

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
  closeFloatingPanels({ restoreFocus: false });
  restoreQuickPanelViewFromPreference();
  refreshQuickPanelContent(shouldShowQuickPanelHistoryContent());

  quickPanel.classList.add("is-open");
  quickPanel.setAttribute("aria-hidden", "false");
  beginShadowRevealAfterOpen(quickPanel);

  if (focusName) {
    requestAnimationFrame(() => quickRenameInput?.focus());
  }
}

export function commitQuickPanelOpen() {
  quickPanel.classList.add("is-open");
  quickPanel.setAttribute("aria-hidden", "false");
}
