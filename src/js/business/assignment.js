import { getState, saveAppState, getCurrentAssignment, defaultStudents } from "../state.js";
import { MAX_ASSIGNMENTS, STATUS } from "../constants.js";
import { makeId, makeDefaultAssignmentTitle } from "../utils/id.js";
import { newAssignmentTitleInput, newAssignmentSubjectInput } from "../dom-refs.js";
import { scheduleRender } from "../render/index.js";
import { announce } from "../utils/dom.js";
import { clone } from "../utils/clone.js";
import { createFreshStudentsFrom } from "../utils/normalize.js";
import { isStudentForceNone } from "../utils/display.js";
import { openConfirm, closeConfirm } from "../ui/confirm.js";
import { closeFloatingPanels } from "../ui/panels.js";
import { clampAssignmentTitle, clampSubject } from "../utils/data-limits.js";
import { traceEvent } from "../utils/trace.js";

export function selectAssignment(assignmentId) {
  traceEvent("assignment.select", { assignmentId: String(assignmentId) });
  getState().currentAssignmentId = assignmentId;
  saveAppState({ history: false });
  scheduleRender();
}

export function renameCurrentAssignmentTitle(rawTitle) {
  const trimmed = clampAssignmentTitle(rawTitle.trim());
  const assignment = getCurrentAssignment();

  if (!trimmed) {
    scheduleRender();
    return { saved: false };
  }

  if (trimmed === assignment.title) {
    if (rawTitle.trim() !== assignment.title) scheduleRender();
    return { saved: false, title: assignment.title };
  }

  assignment.title = trimmed;
  assignment.updatedAt = new Date().toISOString();
  saveAppState({ label: `重命名为「${trimmed}」`, assignmentId: assignment.id });
  scheduleRender();
  announce("已重命名", { action: "undo", assignmentId: assignment.id });
  return { saved: true, title: trimmed };
}

export function updateCurrentAssignmentSubject(subjectValue) {
  traceEvent("assignment.subjectChange", { subject: subjectValue });
  const assignment = getCurrentAssignment();
  assignment.subject = clampSubject(subjectValue);
  const subjectLabel = assignment.subject ? `修改科目为「${assignment.subject}」` : "清除科目";
  saveAppState({ label: subjectLabel, assignmentId: assignment.id });
  scheduleRender();
  announce(assignment.subject ? "科目已更新" : "科目已清除", { action: "undo", assignmentId: assignment.id });
}

export function createAssignmentFromDialog() {
  const state = getState();
  if (state.assignments.length >= MAX_ASSIGNMENTS) {
    announce(`最多只能保留 ${MAX_ASSIGNMENTS} 个作业`);
    return;
  }

  const inputValue = clampAssignmentTitle(newAssignmentTitleInput.value.trim());
  const title = inputValue || makeDefaultAssignmentTitle();
  const subject = clampSubject((newAssignmentSubjectInput && newAssignmentSubjectInput.value.trim()) || "");

  const current = getCurrentAssignment();

  const nextAssignment = {
    id: makeId("assignment"),
    title,
    subject,
    createdAt: new Date().toISOString(),
    students: createFreshStudentsFrom(current.students)
  };

  state.assignments.unshift(nextAssignment);
  state.currentAssignmentId = nextAssignment.id;

  saveAppState({ label: `新建作业「${title}」`, assignmentId: nextAssignment.id });
  scheduleRender();
  closeFloatingPanels();
  announce("已新建作业", { action: "undo", assignmentId: nextAssignment.id });
}

export function invertCurrentAssignmentSubmission() {
  const assignment = getCurrentAssignment();

  assignment.students.forEach(student => {
    if (student.status === STATUS.NONE) return;
    if (isStudentForceNone(student, assignment)) return;

    if (student.status === STATUS.SUBMITTED) {
      student.status = STATUS.NORMAL;

      if (student.badgeType === "submit" || student.badge === "已交") {
        student.badge = "";
        student.badgeType = "";
      }

      return;
    }

    student.status = STATUS.SUBMITTED;
  });

  saveAppState({ label: `反选提交状态「${assignment.title}」`, assignmentId: assignment.id });
  scheduleRender();
}

function removeAssignmentById(assignmentId) {
  const state = getState();
  const index = state.assignments.findIndex(
    item => String(item.id) === String(assignmentId)
  );
  if (index < 0) return null;

  const title = state.assignments[index].title;
  state.assignments.splice(index, 1);

  if (state.assignments.length === 0) {
    const fallback = {
      id: makeId("assignment"),
      title: makeDefaultAssignmentTitle(),
      createdAt: new Date().toISOString(),
      students: createFreshStudentsFrom(defaultStudents)
    };
    state.assignments.push(fallback);
    state.currentAssignmentId = fallback.id;
  } else if (String(state.currentAssignmentId) === String(assignmentId)) {
    const nextIndex = Math.max(0, index - 1);
    state.currentAssignmentId = state.assignments[nextIndex].id;
  }

  return title;
}

export function deleteCurrentAssignment() {
  const currentId = getState().currentAssignmentId;
  const title = removeAssignmentById(currentId);
  if (title == null) return;
  saveAppState({ label: `删除作业「${title}」`, assignmentId: currentId });
  scheduleRender();
}

export function deleteAssignmentFromDrawer(assignmentId) {
  const state = getState();
  const assignment = state.assignments.find(item => String(item.id) === String(assignmentId));
  if (!assignment) return;

  openConfirm({
    title: "删除作业",
    message: `确认删除"${assignment.title}"？该作业中的提交状态、分数和备注会一并删除。`,
    okText: "确认删除",
    danger: true,
    onConfirm: function() {
      const title = removeAssignmentById(assignmentId);
      if (title == null) return;

      saveAppState({ label: `删除作业「${title}」`, assignmentId });
      scheduleRender();
      closeConfirm();
      announce("已删除作业", { action: "undo", assignmentId });
    }
  });
}

export function updateAssignmentFromDrawerEdit(assignmentId, rawTitle, subjectValue) {
  const state = getState();
  const assignment = state.assignments.find(item => String(item.id) === String(assignmentId));
  if (!assignment) return { saved: false };

  const trimmed = clampAssignmentTitle(rawTitle.trim());
  const newSubject = clampSubject(subjectValue);

  if (!trimmed) {
    return { saved: false };
  }

  const titleChanged = trimmed !== assignment.title;
  const subjectChanged = newSubject !== assignment.subject;

  if (!titleChanged && !subjectChanged) {
    return { saved: false };
  }

  if (titleChanged) {
    assignment.title = trimmed;
  }
  if (subjectChanged) {
    assignment.subject = newSubject;
  }

  assignment.updatedAt = new Date().toISOString();
  let historyLabel = "";
  if (titleChanged && subjectChanged) {
    historyLabel = `重命名为「${trimmed}」，科目改为「${newSubject || "无"}」`;
  } else if (titleChanged) {
    historyLabel = `重命名为「${trimmed}」`;
  } else {
    historyLabel = newSubject ? `修改科目为「${newSubject}」` : "清除科目";
  }
  saveAppState({ label: historyLabel, assignmentId });
  scheduleRender();
  if (titleChanged) {
    announce("已重命名", { action: "undo", assignmentId });
  } else {
    announce(newSubject ? "科目已更新" : "科目已清除", { action: "undo", assignmentId });
  }
  return { saved: true };
}
