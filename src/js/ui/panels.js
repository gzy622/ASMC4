import { closeScoreSheet } from "../score-sheet/index.js";
import { addButton, newAssignmentPanel, newAssignmentTitleInput, newAssignmentSubjectInput, quickPanel, quickRenameInput } from "../dom-refs.js";
import { closeConfirm } from "./confirm.js";
import { closeDrawer } from "./drawer.js";
import { refreshQuickPanelContent } from "../render/quickPanel.js";
import { makeDefaultAssignmentTitle } from "../utils/id.js";
import { resetQuickPanelView } from "./history.js";

let abortQuickPanelOpenDrag = () => {};
let pendingNewAssignmentFocus = null;

export function registerQuickPanelOpenDragAbort(fn) {
  abortQuickPanelOpenDrag = fn;
}

function teardownQuickPanelDrag() {
  abortQuickPanelOpenDrag();
  quickPanel.classList.remove("is-dragging");
}

function cancelPendingNewAssignmentFocus() {
  if (!pendingNewAssignmentFocus) return;
  const { element, onEnd, timer } = pendingNewAssignmentFocus;
  element.removeEventListener("transitionend", onEnd);
  clearTimeout(timer);
  pendingNewAssignmentFocus = null;
}

function focusNewAssignmentTitleAfterOpen() {
  cancelPendingNewAssignmentFocus();

  const focus = () => {
    cancelPendingNewAssignmentFocus();
    if (!newAssignmentPanel.classList.contains("is-open")) return;
    newAssignmentTitleInput.focus();
  };

  const onEnd = (event) => {
    if (event.target !== newAssignmentPanel || event.propertyName !== "transform") return;
    focus();
  };

  const timer = setTimeout(focus, 360);
  newAssignmentPanel.addEventListener("transitionend", onEnd);
  pendingNewAssignmentFocus = { element: newAssignmentPanel, onEnd, timer };
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

  focusNewAssignmentTitleAfterOpen();
}

function blurTopSheetFocus() {
  const active = document.activeElement;
  if (active && (newAssignmentPanel.contains(active) || quickPanel.contains(active))) {
    active.blur();
  }
}

export function closeFloatingPanels({ restoreFocus = true } = {}) {
  const wasNewAssignmentPanelOpen = newAssignmentPanel.classList.contains("is-open");

  cancelPendingNewAssignmentFocus();
  blurTopSheetFocus();
  closeScoreSheet();
  teardownQuickPanelDrag();
  resetQuickPanelView();

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
  refreshQuickPanelContent(false);

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
