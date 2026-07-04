import { SUBJECT_OPTIONS } from "../constants.js";
import { assignmentList } from "../dom-refs.js";
import { getState } from "../state.js";
import { scheduleRender } from "../render/index.js";
import { invalidateAssignmentListCache } from "../render/assignmentList.js";
import { updateAssignmentFromDrawerEdit } from "../business/assignment.js";
import { clampAssignmentTitle } from "../utils/data-limits.js";

export function startDrawerAssignmentEdit(assignmentId) {
  const state = getState();
  const assignment = state.assignments.find(item => String(item.id) === String(assignmentId));
  if (!assignment) return;

  if (assignmentList.querySelector(".assignment-edit-input")) return;

  const nameSpan = Array.from(
    assignmentList.querySelectorAll(".assignment-name")
  ).find(node => node.dataset.assignmentId === String(assignmentId));
  if (!nameSpan) return;

  const item = nameSpan.closest(".assignment-item");
  if (!item) return;

  const input = document.createElement("input");
  input.type = "text";
  input.className = "assignment-edit-input";
  input.value = assignment.title;
  input.setAttribute("aria-label", "编辑作业名称");
  input.maxLength = 24;

  nameSpan.replaceWith(input);
  input.focus();
  input.select();

  const select = document.createElement("select");
  select.className = "assignment-edit-subject";
  select.setAttribute("aria-label", "修改作业科目");
  SUBJECT_OPTIONS.forEach(s => {
    const opt = document.createElement("option");
    opt.value = s.value;
    opt.textContent = s.label;
    if (s.value === assignment.subject) opt.selected = true;
    select.appendChild(opt);
  });
  if (assignment.subject && !SUBJECT_OPTIONS.some(s => s.value === assignment.subject)) {
    const opt = document.createElement("option");
    opt.value = assignment.subject;
    opt.textContent = assignment.subject;
    opt.selected = true;
    select.insertBefore(opt, select.firstChild);
  }

  const meta = item.querySelector(".assignment-meta");
  const subjectTag = meta.querySelector(".assignment-subject-tag");
  if (subjectTag) {
    subjectTag.replaceWith(select);
  } else {
    meta.insertBefore(select, meta.firstChild);
  }

  let settled = false;

  function exitEditMode() {
    invalidateAssignmentListCache();
    scheduleRender();
  }

  function commit() {
    if (settled) return;
    settled = true;

    const trimmed = clampAssignmentTitle(input.value.trim());
    if (!trimmed) {
      exitEditMode();
      return;
    }

    const result = updateAssignmentFromDrawerEdit(assignmentId, input.value, select.value);
    if (!result.saved) {
      exitEditMode();
    }
  }

  function cancel() {
    if (settled) return;
    settled = true;
    exitEditMode();
  }

  input.addEventListener("blur", function(event) {
    if (event.relatedTarget && event.relatedTarget.closest(".assignment-edit-subject")) return;
    commit();
  });

  input.addEventListener("keydown", function(event) {
    if (event.key === "Enter") {
      event.preventDefault();
      input.blur();
    } else if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      cancel();
    }
  });

  select.addEventListener("change", commit);

  select.addEventListener("blur", function(event) {
    if (event.relatedTarget && event.relatedTarget.closest(".assignment-edit-input")) return;
    commit();
  });

  select.addEventListener("keydown", function(event) {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      cancel();
    }
  });
}
