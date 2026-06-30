import { liveStatus, appToast, appToastMessage, appToastAction } from "../dom-refs.js";
import { canUndo, canRedo } from "../state.js";

const TOAST_DURATION_MS = 4000;
let toastTimer = null;

export function setThemeColor(color) {
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute("content", color);
  }
}

export function hideToast() {
  clearTimeout(toastTimer);
  toastTimer = null;
  appToast.classList.remove("is-visible");
  appToast.hidden = true;
  appToastAction.hidden = true;
  delete appToastAction.dataset.action;
}

function showToast(message, options = {}) {
  clearTimeout(toastTimer);
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
