import { getState } from "../state.js";
import { STEMS, BRANCHES, STATUS } from "../constants.js";

export function getStateClass(student) {
  if (student.status === STATUS.REGISTERED) return "is-registered";
  if (student.status === STATUS.NONE) return "no-registration";
  return "";
}

export function getDisplayName(student, index) {
  if (!getState().hideNames) return student.name;
  return getStemBranchName(index);
}

export function getStemBranchName(index) {
  const stem = STEMS[index % STEMS.length];
  const branch = BRANCHES[index % BRANCHES.length];
  return `${stem}${branch}`;
}

export function getCardAriaLabel(student, index) {
  const displayName = getDisplayName(student, index);
  const statusText = getStatusText(student.status);
  const badgeText = student.badge ? `，标记 ${student.badge}` : "";
  const noteText = student.note ? `，备注 ${student.note}` : "";
  return `${student.serial}号，${displayName}，${statusText}${badgeText}${noteText}`;
}

export function getStatusText(status) {
  if (status === STATUS.REGISTERED) return "已登记";
  if (status === STATUS.NONE) return "无登记";
  return "普通状态";
}
