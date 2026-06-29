import { getCurrentAssignment, getAssignmentStats } from "../state.js";
import { quickRenameInput, quickSubjectSelect, quickCurrentSubject, quickCurrentStats } from "../dom-refs.js";

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

// Alias for backward compat during migration
export { renderQuickPanel as renderQuickAssignmentList };
