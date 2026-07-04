import { undoAppState, redoAppState, jumpToHistoryEntry, getCurrentAssignment } from "../state.js";
import { undoButton, redoButton, appToastAction, historyPanelButton, historyBackButton, historyList } from "../dom-refs.js";
import { scheduleRender } from "../render/index.js";
import { refreshQuickPanelContent } from "../render/quickPanel.js";
import { announce, hideToast } from "../utils/dom.js";
import { hapticSelection } from "../utils/haptics.js";
import { closeScoreSheet } from "../score-sheet/index.js";
import { closeConfirm } from "../ui/confirm.js";
import { switchToHistoryView, switchToMainView } from "../ui/history.js";
import { traceEvent } from "../utils/trace.js";

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

export function performUndo(assignmentId = getCurrentAssignment().id) {
  traceEvent("history.undo", { assignmentId: String(assignmentId) });
  if (!undoAppState(assignmentId)) return;
  hapticSelection();
  closeTransientEditing();
  scheduleRender();
  announce("已撤回", { action: "redo", assignmentId, showToast: true });
}

export function performRedo(assignmentId = getCurrentAssignment().id) {
  traceEvent("history.redo", { assignmentId: String(assignmentId) });
  if (!redoAppState(assignmentId)) return;
  hapticSelection();
  closeTransientEditing();
  scheduleRender();
  announce("已重做", { action: "undo", assignmentId, showToast: true });
}

export function bindHistoryEvents() {
  undoButton?.addEventListener("click", performUndo);
  redoButton?.addEventListener("click", performRedo);

  historyPanelButton?.addEventListener("click", () => {
    traceEvent("history.panel.open");
    hapticSelection();
    refreshQuickPanelContent(true);
    switchToHistoryView();
  });

  historyBackButton?.addEventListener("click", () => {
    traceEvent("history.panel.back");
    hapticSelection();
    refreshQuickPanelContent(false);
    switchToMainView();
  });

  historyList?.addEventListener("click", event => {
    const entry = event.target.closest(".history-entry");
    if (!entry || entry.classList.contains("is-current")) return;

    const index = Number(entry.dataset.index);
    if (!Number.isInteger(index)) return;
    const assignmentId = getCurrentAssignment().id;
    traceEvent("history.jump", { index, assignmentId: String(assignmentId) });

    if (!jumpToHistoryEntry(index, assignmentId)) return;
    hapticSelection();
    closeTransientEditing();
    scheduleRender();
    hideToast();
  });

  appToastAction?.addEventListener("click", () => {
    const { action } = appToastAction.dataset;
    const assignmentId = appToastAction.dataset.assignmentId;
    if (action === "undo") performUndo(assignmentId);
    else if (action === "redo") performRedo(assignmentId);
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
