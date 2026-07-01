import { liveStatus, appToast, appToastMessage, appToastAction } from "../dom-refs.js";
import { canUndo, canRedo } from "../state.js";

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

function hideToastAfterGesture() {
  appToast.style.transition = "none";
  appToast.classList.remove("is-visible");
  appToast.hidden = true;
  appToastAction.hidden = true;
  delete appToastAction.dataset.action;
  void appToast.offsetWidth;
  appToast.style.transition = "";
  appToast.style.transform = "";
  appToast.style.willChange = "";
  appToast.style.opacity = "";
}

export function hideToast() {
  clearTimeout(toastTimer);
  toastTimer = null;
  abortToastDismiss();

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
  if (action === "undo" && canUndo()) {
    appToastAction.textContent = "撤回";
    appToastAction.hidden = false;
    appToastAction.dataset.action = "undo";
  } else if (action === "redo" && canRedo()) {
    appToastAction.textContent = "重做";
    appToastAction.hidden = false;
    appToastAction.dataset.action = "redo";
  } else {
    appToastAction.hidden = true;
    delete appToastAction.dataset.action;
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
