import { undoAppState, redoAppState, jumpToHistoryEntry } from "../state.js";
import { undoButton, redoButton, appToastAction, historyPanelButton, historyBackButton, historyList } from "../dom-refs.js";
import { render } from "../render/index.js";
import { renderHistoryList } from "../render/history.js";
import { announce, hideToast } from "../utils/dom.js";
import { hapticSelection } from "../utils/haptics.js";
import { closeScoreSheet } from "../score-sheet/index.js";
import { closeConfirm } from "../ui/confirm.js";
import { switchToHistoryView, switchToMainView } from "../ui/history.js";

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
  hapticSelection();
  closeTransientEditing();
  render();
  hideToast();
  announce("已撤回", { action: "redo", showToast: true });
}

export function performRedo() {
  if (!redoAppState()) return;
  hapticSelection();
  closeTransientEditing();
  render();
  hideToast();
  announce("已重做", { action: "undo", showToast: true });
}

export function bindHistoryEvents() {
  undoButton?.addEventListener("click", performUndo);
  redoButton?.addEventListener("click", performRedo);

  historyPanelButton?.addEventListener("click", () => {
    hapticSelection();
    renderHistoryList();
    switchToHistoryView();
  });

  historyBackButton?.addEventListener("click", () => {
    hapticSelection();
    switchToMainView();
  });

  historyList?.addEventListener("click", event => {
    const entry = event.target.closest(".history-entry");
    if (!entry || entry.classList.contains("is-current")) return;

    const index = Number(entry.dataset.index);
    if (!Number.isInteger(index)) return;

    if (!jumpToHistoryEntry(index)) return;
    hapticSelection();
    closeTransientEditing();
    render();
    hideToast();
  });

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
