import { getState, saveAppState, getCurrentAssignment, defaultStudents } from "../state.js";
import { STATUS } from "../constants.js";
import { makeId, makeDefaultAssignmentTitle } from "../utils/id.js";
import { newAssignmentInput, newAssignmentSubjectInput } from "../dom-refs.js";
import { render } from "../render/index.js";
import { announce } from "../utils/dom.js";
import { clone } from "../utils/clone.js";
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

export function createFreshStudentsFrom(students) {
  return students.map((student, index) => {
    const isNoRegistration = student.status === STATUS.NONE;

    return {
      id: Number(student.id) || index + 1,
      serial: String(student.serial || index + 1).padStart(2, "0"),
      name: String(student.name || "未命名"),
      status: isNoRegistration ? STATUS.NONE : STATUS.NORMAL,
      badge: "",
      badgeType: "",
      updatedAt: ""
    };
  });
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

    if (!student.badge) {
      student.badge = "已交";
      student.badgeType = "submit";
    }
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
      title: "新作业",
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
          title: "新作业",
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

export function renameAssignment(assignmentId) {
  const state = getState();
  const assignment = state.assignments.find(item => item.id === assignmentId);
  if (!assignment) return;

  if (assignmentList.querySelector(".assignment-edit-input")) return;

  const nameSpan = Array.from(
    assignmentList.querySelectorAll(".assignment-name")
  ).find(node => node.dataset.assignmentId === String(assignmentId));
  if (!nameSpan) return;

  const input = document.createElement("input");
  input.type = "text";
  input.className = "assignment-edit-input";
  input.value = assignment.title;
  input.setAttribute("aria-label", "编辑作业名称");
  input.maxLength = 24;

  nameSpan.replaceWith(input);
  input.focus();
  input.select();
  let settled = false;

  function commit() {
    if (settled) return;
    settled = true;
    const trimmed = input.value.trim();
    if (trimmed && trimmed !== assignment.title) {
      assignment.title = trimmed;
      assignment.updatedAt = new Date().toISOString();
      saveAppState();
      render();
      announce("已重命名为" + trimmed);
    } else if (!trimmed) {
      render();
    } else {
      render();
    }
  }

  function cancel() {
    if (settled) return;
    settled = true;
    render();
  }

  input.addEventListener("blur", commit);
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
}
