import { escapeHTML } from "../utils/escapeHTML.js";
import { getStateClass, getDisplayName, getCardAriaLabel } from "../utils/display.js";
import { grid } from "../dom-refs.js";

export function renderStudents(state, assignment) {
  grid.innerHTML = assignment.students.map((student, index) => {
    const stateClass = getStateClass(student);
    const displayName = getDisplayName(student, index);

    const badgeHTML = student.badge
      ? `<div class="badge">${escapeHTML(student.badge)}</div>`
      : "";

    return `
      <button
        class="student-card ${stateClass}"
        type="button"
        data-id="${student.id}"
        aria-label="${escapeHTML(getCardAriaLabel(student, index))}"
      >
        <div class="serial">${escapeHTML(student.serial)}</div>
        ${badgeHTML}
        <div class="name">${escapeHTML(displayName)}</div>
        ${student.note ? `<div class="note-text">${escapeHTML(student.note)}</div>` : ""}
      </button>
    `;
  }).join("");
}
