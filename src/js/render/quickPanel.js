import { escapeHTML } from "../utils/escapeHTML.js";
import { quickAssignmentList, quickRenameInput, quickSubjectSelect } from "../dom-refs.js";
import { getCurrentAssignment } from "../state.js";

export function renderQuickAssignmentList(state) {
  quickAssignmentList.innerHTML = state.assignments.map(assignment => {
    const activeClass = assignment.id === state.currentAssignmentId ? "is-active" : "";
    return `<button class="quick-chip ${activeClass}" type="button" data-assignment-id="${escapeHTML(assignment.id)}">${escapeHTML(assignment.title)}</button>`;
  }).join("");

  const current = getCurrentAssignment();
  if (quickRenameInput) {
    quickRenameInput.value = current.title || "";
  }
  if (quickSubjectSelect) {
    quickSubjectSelect.value = current.subject || "";
  }
}
