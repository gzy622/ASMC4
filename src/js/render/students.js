import { escapeHTML } from "../utils/escapeHTML.js";
import { getStateClass, getDisplayName, getCardAriaLabel } from "../utils/display.js";
import { studentGrid } from "../dom-refs.js";

const renderedCards = new Map();
let renderedAssignmentId = null;
let renderedStudentIds = "";

function buildCardHTML(student, index, assignment) {
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
}

function getCardSnapshot(student, index, assignment) {
  return {
    stateClass: getStateClass(student, assignment),
    displayName: getDisplayName(student, index),
    badge: student.badge || "",
    note: student.note || "",
    serial: String(student.serial),
    ariaLabel: getCardAriaLabel(student, index, assignment)
  };
}

function syncCardStateClass(el, stateClass) {
  el.classList.toggle("is-submitted", stateClass === "is-submitted");
  el.classList.toggle("no-registration", stateClass === "no-registration");
}

function patchCard(el, cached, snap) {
  if (cached.stateClass !== snap.stateClass) {
    syncCardStateClass(el, snap.stateClass);
    cached.stateClass = snap.stateClass;
  }

  if (cached.serial !== snap.serial) {
    el.querySelector(".serial").textContent = snap.serial;
    cached.serial = snap.serial;
  }

  let badgeEl = el.querySelector(".badge");
  if (snap.badge) {
    if (!badgeEl) {
      badgeEl = document.createElement("div");
      badgeEl.className = "badge";
      el.querySelector(".serial").after(badgeEl);
    }
    if (cached.badge !== snap.badge) {
      badgeEl.textContent = snap.badge;
      cached.badge = snap.badge;
    }
  } else if (badgeEl) {
    badgeEl.remove();
    cached.badge = "";
  }

  if (cached.displayName !== snap.displayName) {
    el.querySelector(".name").textContent = snap.displayName;
    cached.displayName = snap.displayName;
  }

  let noteEl = el.querySelector(".note-text");
  if (snap.note) {
    if (!noteEl) {
      noteEl = document.createElement("div");
      noteEl.className = "note-text";
      el.appendChild(noteEl);
    }
    if (cached.note !== snap.note) {
      noteEl.textContent = snap.note;
      cached.note = snap.note;
    }
  } else if (noteEl) {
    noteEl.remove();
    cached.note = "";
  }

  if (cached.ariaLabel !== snap.ariaLabel) {
    el.setAttribute("aria-label", snap.ariaLabel);
    cached.ariaLabel = snap.ariaLabel;
  }
}

function needsFullRebuild(assignment) {
  const ids = assignment.students.map(student => String(student.id)).join(",");
  return renderedAssignmentId !== assignment.id
    || renderedStudentIds !== ids
    || renderedCards.size !== assignment.students.length;
}

function fullRebuild(assignment) {
  studentGrid.innerHTML = assignment.students.map((student, index) => {
    return buildCardHTML(student, index, assignment);
  }).join("");

  renderedCards.clear();
  assignment.students.forEach((student, index) => {
    const el = studentGrid.children[index];
    const snap = getCardSnapshot(student, index, assignment);
    renderedCards.set(String(student.id), { el, ...snap });
  });

  renderedAssignmentId = assignment.id;
  renderedStudentIds = assignment.students.map(student => String(student.id)).join(",");
}

export function renderStudents(state, assignment) {
  if (needsFullRebuild(assignment)) {
    fullRebuild(assignment);
    return;
  }

  assignment.students.forEach((student, index) => {
    const cached = renderedCards.get(String(student.id));
    if (!cached) return;
    patchCard(cached.el, cached, getCardSnapshot(student, index, assignment));
  });
}
