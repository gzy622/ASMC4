import { liveStatus, appToast, appToastMessage, appToastAction, themeColorMeta } from "../dom-refs.js";
import { canUndo, canRedo, pruneAssignmentHistoryIfOrphan } from "../state.js";

const TOAST_DURATION_MS = 3200;
const TOAST_FEEDBACK_DURATION_MS = 4200;
const TOAST_FADE_MS = 180;
let toastTimer = null;
let abortToastDismiss = () => {};
let toastSwipeDismissing = false;
let pendingHide = null;

function cancelPendingHide() {
  if (!pendingHide) return;
  pendingHide.cancelled = true;
  appToast.removeEventListener("transitionend", pendingHide.onFadeEnd);
  clearTimeout(pendingHide.timeoutId);
  pendingHide = null;
}

export function registerToastDismissAbort(fn) {
  abortToastDismiss = fn;
}

export function setToastSwipeDismissing(active) {
  toastSwipeDismissing = active;
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
  appToast.classList.remove("is-visible", "is-fading-out");
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

function finalizeHideToast(prunableAssignmentId) {
  clearToastInlineStyles();
  appToast.classList.remove("is-visible", "is-fading-out");
  appToast.hidden = true;
  appToastAction.hidden = true;
  delete appToastAction.dataset.action;
  delete appToastAction.dataset.assignmentId;
  finalizeToastDismiss(prunableAssignmentId);
}

export function hideToast() {
  clearTimeout(toastTimer);
  toastTimer = null;
  cancelPendingHide();

  const prunableAssignmentId = appToastAction.dataset.assignmentId;
  const fromGesture = toastSwipeDismissing;
  toastSwipeDismissing = false;

  if (fromGesture) {
    hideToastAfterGesture();
    return;
  }

  abortToastDismiss();

  if (appToast.hidden || appToast.classList.contains("is-fading-out")) {
    if (appToast.hidden) {
      finalizeHideToast(prunableAssignmentId);
    }
    return;
  }

  if (!appToast.classList.contains("is-visible")) {
    finalizeHideToast(prunableAssignmentId);
    return;
  }

  appToast.classList.remove("is-visible");
  appToast.classList.add("is-fading-out");

  let finished = false;
  const done = () => {
    if (finished || pendingHide?.cancelled) return;
    finished = true;
    pendingHide = null;
    appToast.removeEventListener("transitionend", onFadeEnd);
    finalizeHideToast(prunableAssignmentId);
  };
  const onFadeEnd = (event) => {
    if (event.target === appToast && event.propertyName === "opacity") {
      done();
    }
  };
  appToast.addEventListener("transitionend", onFadeEnd);
  const timeoutId = setTimeout(done, TOAST_FADE_MS + 40);
  pendingHide = { cancelled: false, onFadeEnd, timeoutId };
}

export function setThemeColor(color) {
  if (themeColorMeta) {
    themeColorMeta.setAttribute("content", color);
  }
}

function updateToastAction(action, assignmentId) {
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
}

function showToast(message, options = {}) {
  clearTimeout(toastTimer);
  abortToastDismiss();
  cancelPendingHide();

  const wasVisible = !appToast.hidden && appToast.classList.contains("is-visible");
  const wasFading = appToast.classList.contains("is-fading-out");

  if (wasFading) {
    appToast.classList.remove("is-fading-out");
    clearToastInlineStyles();
    appToast.hidden = false;
    appToast.classList.add("is-visible");
  } else if (!wasVisible) {
    clearToastInlineStyles();
    appToast.classList.remove("is-fading-out");
    appToast.hidden = false;
    requestAnimationFrame(() => appToast.classList.add("is-visible"));
  }

  appToastMessage.textContent = message;
  updateToastAction(options.action, options.assignmentId);
  const duration = options.duration ?? (options.showToast ? TOAST_FEEDBACK_DURATION_MS : TOAST_DURATION_MS);
  toastTimer = setTimeout(hideToast, duration);
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
