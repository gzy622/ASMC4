import {
  MAX_ASSIGNMENTS,
  MAX_ASSIGNMENT_TITLE_LENGTH,
  MAX_ROSTER_SIZE,
  MAX_STATE_BYTES,
  MAX_STUDENT_NAME_LENGTH,
  MAX_STUDENT_NOTE_LENGTH,
  MAX_SUBJECT_LENGTH
} from "../constants.js";

export function clampText(value, maxLength) {
  return String(value ?? "").slice(0, maxLength);
}

export function clampAssignmentTitle(value) {
  return clampText(value, MAX_ASSIGNMENT_TITLE_LENGTH);
}

export function clampSubject(value) {
  return clampText(value, MAX_SUBJECT_LENGTH);
}

export function clampStudentName(value) {
  return clampText(value, MAX_STUDENT_NAME_LENGTH);
}

export function clampStudentNote(value) {
  return clampText(value, MAX_STUDENT_NOTE_LENGTH);
}

export function getSerializedSizeBytes(serialized) {
  return new TextEncoder().encode(serialized).length;
}

export function getAppStateLimitError(state) {
  if (!state || !Array.isArray(state.assignments)) {
    return "数据格式无效";
  }

  if (state.assignments.length > MAX_ASSIGNMENTS) {
    return `作业数量不能超过 ${MAX_ASSIGNMENTS} 个`;
  }

  if (Array.isArray(state.roster) && state.roster.length > MAX_ROSTER_SIZE) {
    return `学生数量不能超过 ${MAX_ROSTER_SIZE} 人`;
  }

  if (state.assignments.some(item => !item || !Array.isArray(item.students) || item.students.length > MAX_ROSTER_SIZE)) {
    return `单个作业的学生数量不能超过 ${MAX_ROSTER_SIZE} 人`;
  }

  const serialized = JSON.stringify(state);
  if (getSerializedSizeBytes(serialized) > MAX_STATE_BYTES) {
    return "数据太大，已超过本地可安全保存的范围";
  }

  return "";
}
