import { escapeHTML } from "../utils/escapeHTML.js";
import { getStateClass, getDisplayName, getCardAriaLabel, isStudentForceNone } from "../utils/display.js";
import { grid } from "../dom-refs.js";

export function renderStudents(state, assignment) {
  grid.innerHTML = assignment.students.map((student, index) => {
    const stateClass = getStateClass(student, assignment);
    const displayName = getDisplayName(student, index);
    const safeId = escapeHTML(student.id);

    const badgeHTML = student.badge
      ? `<div class="badge">${escapeHTML(student.badge)}</div>`
      : "";

    return `
      <button
        class="student-card ${stateClass}"
        type="button"
        data-id="${safeId}"
        aria-label="${escapeHTML(getCardAriaLabel(student, index, assignment))}"
      >
        <div class="serial">${escapeHTML(student.serial)}</div>
        ${badgeHTML}
        <div class="name">${escapeHTML(displayName)}</div>
        ${student.note ? `<div class="note-text">${escapeHTML(student.note)}</div>` : ""}
      </button>
    `;
  }).join("");
}
