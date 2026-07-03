import { getCurrentAssignment, getAssignmentStats, canUndo, canRedo } from "../state.js";
import { quickRenameInput, quickSubjectSelect, quickCurrentSubject, quickCurrentStats, undoButton, redoButton, quickPanel, quickPanelCloseButton, quickPanelTitle } from "../dom-refs.js";
import { isHistoryViewActive } from "../ui/history.js";
import { renderHistoryList } from "./history.js";

export function renderQuickPanelHeader(historyViewActive = false) {
  if (!quickPanel || !quickPanelCloseButton || !quickPanelTitle) return;

  if (historyViewActive) {
    const current = getCurrentAssignment();
    const title = current.title || "未命名作业";
    quickPanelTitle.textContent = title;
    quickPanel.setAttribute("aria-label", "操作记录");
    quickPanelCloseButton.setAttribute("aria-label", "关闭操作记录");
    return;
  }

  quickPanelTitle.textContent = "当前作业";
  quickPanel.setAttribute("aria-label", "当前作业");
  quickPanelCloseButton.setAttribute("aria-label", "关闭当前作业");
}

export function renderQuickPanel() {
  const current = getCurrentAssignment();
  const stats = getAssignmentStats(current);

  if (quickCurrentSubject) {
    const subject = current.subject?.trim() || "";
    if (subject) {
      quickCurrentSubject.textContent = subject;
      quickCurrentSubject.hidden = false;
    } else {
      quickCurrentSubject.textContent = "";
      quickCurrentSubject.hidden = true;
    }
  }

  if (quickCurrentStats) {
    quickCurrentStats.textContent = `${stats.submitted}/${stats.total} 已交`;
  }

  if (quickRenameInput && document.activeElement !== quickRenameInput) {
    quickRenameInput.value = current.title || "";
  }

  if (quickSubjectSelect && document.activeElement !== quickSubjectSelect) {
    quickSubjectSelect.value = current.subject || "";
  }
}

export function renderHistoryButtons() {
  if (undoButton) undoButton.disabled = !canUndo();
  if (redoButton) redoButton.disabled = !canRedo();
}

export function refreshQuickPanelContent(historyViewActive = false) {
  renderQuickPanelHeader(historyViewActive);
  if (historyViewActive) {
    renderHistoryList();
  } else {
    renderQuickPanel();
  }
}

export function refreshOpenQuickPanel() {
  renderHistoryButtons();
  if (!quickPanel?.classList.contains("is-open")) return;
  refreshQuickPanelContent(isHistoryViewActive());
}
