import { STATUS } from "../constants.js";
import { makeId } from "./id.js";

export function normalizeAssignment(assignment, assignmentIndex) {
  return {
    id: String(assignment.id || makeId(`assignment-${assignmentIndex}`)),
    title: String(assignment.title || "未命名作业"),
    subject: String(assignment.subject || ""),
    createdAt: assignment.createdAt || new Date().toISOString(),
    students: assignment.students.map(normalizeStudent)
  };
}

export function normalizeStudent(student, index) {
  const fallbackSerial = String(index + 1).padStart(2, "0");

  return {
    id: Number(student.id) || index + 1,
    serial: String(student.serial || fallbackSerial).padStart(2, "0"),
    name: String(student.name || "未命名"),
    status: [STATUS.NORMAL, STATUS.SUBMITTED, STATUS.NONE].includes(student.status)
      ? student.status
      : STATUS.NORMAL,
    badge: String(student.badge || ""),
    badgeType: String(student.badgeType || ""),
    note: String(student.note || ""),
    updatedAt: student.updatedAt || ""
  };
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
      note: "",
      updatedAt: ""
    };
  });
}

export function normalizeRosterEntry(entry, index) {
  const fallbackSerial = String(index + 1).padStart(2, "0");
  return {
    id: Number(entry.id) || index + 1,
    serial: String(entry.serial || fallbackSerial).padStart(2, "0"),
    name: String(entry.name || "").trim() || "未命名",
    nonEnglish: Boolean(entry.nonEnglish)
  };
}

export function normalizeRosterFromBackup(data, fallbackStudents) {
  const sourceRoster = Array.isArray(data?.roster) ? data.roster : fallbackStudents;
  const roster = sourceRoster.map(normalizeRosterEntry);
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
