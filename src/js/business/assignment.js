import { getState, saveAppState, getCurrentAssignment, defaultStudents } from "../state.js";
import { STATUS } from "../constants.js";
import { makeId, makeDefaultAssignmentTitle } from "../utils/id.js";
import { newAssignmentInput, newAssignmentSubjectInput } from "../dom-refs.js";
import { render } from "../render/index.js";
import { announce } from "../utils/dom.js";
import { clone } from "../utils/clone.js";
import { createFreshStudentsFrom } from "../utils/normalize.js";
import { isStudentForceNone } from "../utils/display.js";
import { assignmentList } from "../dom-refs.js";
import { openConfirm, closeConfirm } from "../ui/confirm.js";
import { closeDrawer } from "../ui/drawer.js";
import { closeAllCenterPanels } from "../ui/panels.js";

export function createAssignmentFromDialog() {
  const inputValue = newAssignmentInput.value.trim();
  const title = inputValue || makeDefaultAssignmentTitle();
  const subject = (newAssignmentSubjectInput && newAssignmentSubjectInput.value.trim()) || "";

  const current = getCurrentAssignment();

  const nextAssignment = {
    id: makeId("assignment"),
    title,
    subject,
    createdAt: new Date().toISOString(),
    students: createFreshStudentsFrom(current.students)
  };

  const state = getState();
  state.assignments.unshift(nextAssignment);
  state.currentAssignmentId = nextAssignment.id;

  saveAppState();
  render();
  closeAllCenterPanels();
  announce(`已新建作业：${title}`);
}

export function invertCurrentAssignmentSubmission() {
  const assignment = getCurrentAssignment();

  assignment.students.forEach(student => {
    if (student.status === STATUS.NONE) return;
    if (isStudentForceNone(student, assignment)) return;

    if (student.status === STATUS.REGISTERED) {
      student.status = STATUS.NORMAL;

      if (student.badgeType === "submit" || student.badge === "已交") {
        student.badge = "";
        student.badgeType = "";
      }

      return;
    }

    student.status = STATUS.REGISTERED;
  });

  saveAppState();
  render();
}

export function deleteCurrentAssignment() {
  const state = getState();
  const currentId = state.currentAssignmentId;
  const currentIndex = state.assignments.findIndex(item => item.id === currentId);

  if (currentIndex >= 0) {
    state.assignments.splice(currentIndex, 1);
  }

  if (state.assignments.length === 0) {
    const fallback = {
      id: makeId("assignment"),
      title: makeDefaultAssignmentTitle(),
      createdAt: new Date().toISOString(),
      students: createFreshStudentsFrom(defaultStudents)
    };

    state.assignments.push(fallback);
    state.currentAssignmentId = fallback.id;
  } else {
    const nextIndex = Math.max(0, currentIndex - 1);
    state.currentAssignmentId = state.assignments[nextIndex].id;
  }

  saveAppState();
  render();
}

export function deleteAssignmentFromDrawer(assignmentId) {
  const state = getState();
  const assignment = state.assignments.find(item => item.id === assignmentId);
  if (!assignment) return;

  openConfirm({
    title: "删除作业",
    message: `确认删除"${assignment.title}"？该作业中的提交状态、分数和备注会一并删除。`,
    okText: "确认删除",
    danger: true,
    onConfirm: function() {
      const wasCurrent = state.currentAssignmentId === assignmentId;

      const idx = state.assignments.findIndex(item => item.id === assignmentId);
      if (idx >= 0) {
        state.assignments.splice(idx, 1);
      }

      if (state.assignments.length === 0) {
        const fallback = {
          id: makeId("assignment"),
          title: makeDefaultAssignmentTitle(),
          createdAt: new Date().toISOString(),
          students: createFreshStudentsFrom(defaultStudents)
        };
        state.assignments.push(fallback);
        state.currentAssignmentId = fallback.id;
      } else if (wasCurrent) {
        const nextIndex = Math.max(0, idx - 1);
        state.currentAssignmentId = state.assignments[nextIndex].id;
      }

      saveAppState();
      render();
      closeConfirm();
      announce("已删除作业");
    }
  });
}

const SUBJECT_OPTIONS = [
  { value: "", label: "不指定" },
  { value: "英语", label: "英语" },
  { value: "数学", label: "数学" },
  { value: "语文", label: "语文" },
  { value: "物理", label: "物理" },
  { value: "化学", label: "化学" },
  { value: "生物", label: "生物" },
  { value: "历史", label: "历史" },
  { value: "地理", label: "地理" },
  { value: "政治", label: "政治" }
];

export function renameAssignment(assignmentId) {
  const state = getState();
  const assignment = state.assignments.find(item => item.id === assignmentId);
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

  const meta = item.querySelector(".assignment-meta");
  const subjectTag = meta.querySelector(".assignment-subject-tag");
  if (subjectTag) {
    subjectTag.replaceWith(select);
  } else {
    meta.insertBefore(select, meta.firstChild);
  }

  let settled = false;

  function commit() {
    if (settled) return;
    settled = true;

    const trimmed = input.value.trim();
    const newSubject = select.value;

    if (!trimmed) {
      render();
      return;
    }

    const titleChanged = trimmed !== assignment.title;
    const subjectChanged = newSubject !== assignment.subject;

    if (titleChanged) {
      assignment.title = trimmed;
    }

    if (subjectChanged) {
      assignment.subject = newSubject;
    }

    if (titleChanged || subjectChanged) {
      assignment.updatedAt = new Date().toISOString();
      saveAppState();
      render();
      const parts = [];
      if (titleChanged) parts.push(`已重命名为${trimmed}`);
      if (subjectChanged) parts.push(newSubject ? `科目已设为${newSubject}` : "已清除科目");
      announce(parts.join("，"));
    } else {
      render();
    }
  }

  function cancel() {
    if (settled) return;
    settled = true;
    render();
  }

  input.addEventListener("blur", function(e) {
    if (e.relatedTarget && e.relatedTarget.closest(".assignment-edit-subject")) return;
    commit();
  });

  input.addEventListener("keydown", function(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      input.blur();
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      cancel();
    }
  });

  select.addEventListener("change", commit);

  select.addEventListener("blur", function(e) {
    if (e.relatedTarget && e.relatedTarget.closest(".assignment-edit-input")) return;
    commit();
  });

  select.addEventListener("keydown", function(e) {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      cancel();
    }
  });
}
