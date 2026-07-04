import { MAX_ROSTER_SIZE, STATUS } from "../constants.js";
import { makeId } from "./id.js";
import { clampAssignmentTitle, clampStudentName, clampStudentNote, clampSubject } from "./data-limits.js";

function normalizeNumericId(rawId, index) {
  const numericId = Number(rawId);
  return Number.isFinite(numericId) && numericId > 0
    ? String(numericId)
    : String(index + 1);
}

export function normalizeAssignment(assignment, assignmentIndex) {
  return {
    id: String(assignment.id || makeId(`assignment-${assignmentIndex}`)),
    title: clampAssignmentTitle(assignment.title || "未命名作业") || "未命名作业",
    subject: clampSubject(assignment.subject || ""),
    createdAt: assignment.createdAt || new Date().toISOString(),
    students: assignment.students.slice(0, MAX_ROSTER_SIZE).map(normalizeStudent)
  };
}

export function normalizeStudent(student, index) {
  const fallbackSerial = String(index + 1).padStart(2, "0");

  return {
    id: normalizeNumericId(student.id, index),
    serial: String(student.serial || fallbackSerial).padStart(2, "0"),
    name: clampStudentName(student.name || "未命名") || "未命名",
    status: [STATUS.NORMAL, STATUS.SUBMITTED, STATUS.NONE].includes(student.status)
      ? student.status
      : STATUS.NORMAL,
    badge: String(student.badge || ""),
    badgeType: String(student.badgeType || ""),
    note: clampStudentNote(student.note || ""),
    updatedAt: student.updatedAt || ""
  };
}

export function createFreshStudentsFrom(students) {
  return students.slice(0, MAX_ROSTER_SIZE).map((student, index) => {
    const isNoRegistration = student.status === STATUS.NONE;

    return {
      id: normalizeNumericId(student.id, index),
      serial: String(student.serial || index + 1).padStart(2, "0"),
      name: clampStudentName(student.name || "未命名") || "未命名",
      status: isNoRegistration ? STATUS.NONE : STATUS.NORMAL,
      badge: "",
      badgeType: "",
      note: "",
      updatedAt: ""
    };
  });
}

export function normalizeRosterEntry(entry, index) {
  const fallbackSerial = String(index + 1).padStart(2, "0");
  return {
    id: normalizeNumericId(entry.id, index),
    serial: String(entry.serial || fallbackSerial).padStart(2, "0"),
    name: clampStudentName(String(entry.name || "").trim()) || "未命名",
    nonEnglish: Boolean(entry.nonEnglish)
  };
}

export function normalizeRosterFromBackup(data, fallbackStudents) {
  const sourceRoster = Array.isArray(data?.roster) ? data.roster : fallbackStudents;
  const roster = sourceRoster.slice(0, MAX_ROSTER_SIZE).map(normalizeRosterEntry);
  const nonEnglishIds = new Set(
    Array.isArray(data?.nonEnglishStudents)
      ? data.nonEnglishStudents.map(item => String(item && item.id))
      : []
  );

  if (nonEnglishIds.size > 0) {
    roster.forEach(item => {
      if (nonEnglishIds.has(String(item.id))) {
        item.nonEnglish = true;
      }
    });
  }

  return roster;
}
