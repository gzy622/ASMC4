import { getCurrentAssignment, getAssignmentStats, canUndo, canRedo } from "../state.js";
import { quickRenameInput, quickSubjectSelect, quickCurrentSubject, quickCurrentStats, undoButton, redoButton } from "../dom-refs.js";

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

  if (quickRenameInput) {
    quickRenameInput.value = current.title || "";
  }

  if (quickSubjectSelect) {
    quickSubjectSelect.value = current.subject || "";
  }
}

export function renderHistoryButtons() {
  if (undoButton) undoButton.disabled = !canUndo();
  if (redoButton) redoButton.disabled = !canRedo();
}

// Alias for backward compat during migration
export { renderQuickPanel as renderQuickAssignmentList };
