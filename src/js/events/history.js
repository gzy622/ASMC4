import { undoAppState, redoAppState } from "../state.js";
import { undoButton, redoButton, appToastAction } from "../dom-refs.js";
import { render } from "../render/index.js";
import { announce, hideToast } from "../utils/dom.js";
import { closeScoreSheet } from "../score-sheet/index.js";
import { closeConfirm } from "../ui/confirm.js";

function isEditableTarget(element) {
  if (!element) return false;
  const tag = element.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return element.isContentEditable;
}

function closeTransientEditing() {
  closeScoreSheet();
  closeConfirm();
}

export function performUndo() {
  if (!undoAppState()) return;
  closeTransientEditing();
  render();
  hideToast();
  announce("已撤回", { action: "redo", showToast: true });
}

export function performRedo() {
  if (!redoAppState()) return;
  closeTransientEditing();
  render();
  hideToast();
  announce("已重做", { action: "undo", showToast: true });
}

export function bindHistoryEvents() {
  undoButton?.addEventListener("click", performUndo);
  redoButton?.addEventListener("click", performRedo);

  appToastAction?.addEventListener("click", () => {
    const { action } = appToastAction.dataset;
    if (action === "undo") performUndo();
    else if (action === "redo") performRedo();
  });

  document.addEventListener("keydown", event => {
    if (isEditableTarget(document.activeElement)) return;

    const mod = event.ctrlKey || event.metaKey;
    if (!mod) return;

    if (event.key === "z" || event.key === "Z") {
      event.preventDefault();
      if (event.shiftKey) performRedo();
      else performUndo();
      return;
    }

    if (event.key === "y" || event.key === "Y") {
      event.preventDefault();
      performRedo();
    }
  });
}
