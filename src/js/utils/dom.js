import { liveStatus, appToast, appToastMessage, appToastAction } from "../dom-refs.js";
import { canUndo, canRedo, pruneAssignmentHistoryIfOrphan } from "../state.js";

const TOAST_DURATION_MS = 4000;
let toastTimer = null;
let abortToastDismiss = () => {};

export function registerToastDismissAbort(fn) {
  abortToastDismiss = fn;
}

function clearToastInlineStyles() {
  appToast.style.transition = "none";
  appToast.style.transform = "";
  appToast.style.willChange = "";
  appToast.style.opacity = "";
  void appToast.offsetWidth;
  appToast.style.transition = "";
}

function finalizeToastDismiss(prunableAssignmentId) {
  if (prunableAssignmentId) {
    pruneAssignmentHistoryIfOrphan(prunableAssignmentId);
  }
}

function hideToastAfterGesture() {
  const prunableAssignmentId = appToastAction.dataset.assignmentId;
  appToast.style.transition = "none";
  appToast.classList.remove("is-visible");
  appToast.hidden = true;
  appToastAction.hidden = true;
  delete appToastAction.dataset.action;
  delete appToastAction.dataset.assignmentId;
  void appToast.offsetWidth;
  appToast.style.transition = "";
  appToast.style.transform = "";
  appToast.style.willChange = "";
  appToast.style.opacity = "";
  finalizeToastDismiss(prunableAssignmentId);
}

export function hideToast() {
  clearTimeout(toastTimer);
  toastTimer = null;
  abortToastDismiss();

  const prunableAssignmentId = appToastAction.dataset.assignmentId;
  const fromGesture =
    appToast.style.transform !== "" || appToast.style.opacity !== "";

  if (fromGesture) {
    hideToastAfterGesture();
    return;
  }

  appToast.classList.remove("is-visible");
  appToast.hidden = true;
  appToastAction.hidden = true;
  delete appToastAction.dataset.action;
  delete appToastAction.dataset.assignmentId;
  finalizeToastDismiss(prunableAssignmentId);
}

export function setThemeColor(color) {
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute("content", color);
  }
}

function showToast(message, options = {}) {
  clearTimeout(toastTimer);
  abortToastDismiss();
  clearToastInlineStyles();
  appToastMessage.textContent = message;

  const action = options.action;
  const assignmentId = options.assignmentId;
  if (action === "undo" && canUndo(assignmentId)) {
    appToastAction.textContent = "撤回";
    appToastAction.hidden = false;
    appToastAction.dataset.action = "undo";
    if (assignmentId != null) appToastAction.dataset.assignmentId = String(assignmentId);
    else delete appToastAction.dataset.assignmentId;
  } else if (action === "redo" && canRedo(assignmentId)) {
    appToastAction.textContent = "重做";
    appToastAction.hidden = false;
    appToastAction.dataset.action = "redo";
    if (assignmentId != null) appToastAction.dataset.assignmentId = String(assignmentId);
    else delete appToastAction.dataset.assignmentId;
  } else {
    appToastAction.hidden = true;
    delete appToastAction.dataset.action;
    delete appToastAction.dataset.assignmentId;
  }

  appToast.hidden = false;
  requestAnimationFrame(() => appToast.classList.add("is-visible"));
  toastTimer = setTimeout(hideToast, TOAST_DURATION_MS);
}

export function announce(message, options = {}) {
  liveStatus.textContent = message;

  const showToastUi = options.showToast ?? options.action != null;
  if (showToastUi) {
    showToast(message, options);
  } else {
    hideToast();
  }
}
