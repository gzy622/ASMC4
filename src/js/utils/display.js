import { getState } from "../state.js";
import { STEMS, BRANCHES, STATUS } from "../constants.js";

export function isNonEnglishRosterEntry(studentId) {
  const state = getState();
  const entry = state.roster.find(r => String(r.id) === String(studentId));
  return Boolean(entry && entry.nonEnglish);
}

export function isSubjectEnglish(assignment) {
  return Boolean(assignment && assignment.subject === "英语");
}

export function isStudentForceNone(student, assignment) {
  return isSubjectEnglish(assignment) && isNonEnglishRosterEntry(student.id);
}

export function getEffectiveStatus(student, assignment) {
  if (isStudentForceNone(student, assignment)) return STATUS.NONE;
  return student.status;
}

export function getStateClass(student, assignment) {
  const status = getEffectiveStatus(student, assignment);
  if (status === STATUS.SUBMITTED) return "is-submitted";
  if (status === STATUS.NONE) return "no-registration";
  return "";
}

export function getDisplayName(student, index) {
  if (getState().showRealNames) return student.name;
  return getStemBranchName(index);
}

export function getStemBranchName(index) {
  const stem = STEMS[index % STEMS.length];
  const branch = BRANCHES[index % BRANCHES.length];
  return `${stem}${branch}`;
}

export function getCardAriaLabel(student, index, assignment) {
  const displayName = getDisplayName(student, index);
  const effectiveStatus = getEffectiveStatus(student, assignment);
  const statusText = getStatusText(effectiveStatus);
  const forcedNone = isStudentForceNone(student, assignment);
  const reasonText = forcedNone ? "，非英语" : "";
  const badgeText = student.badge ? `，标记 ${student.badge}` : "";
  const noteText = student.note ? `，备注 ${student.note}` : "";
  return `${student.serial}号，${displayName}，${statusText}${reasonText}${badgeText}${noteText}`;
}

export function getStatusText(status) {
  if (status === STATUS.SUBMITTED) return "已交";
  if (status === STATUS.NONE) return "无登记";
  return "普通状态";
}
