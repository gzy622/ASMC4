import { STATUS } from "../constants.js";
import { makeId } from "./id.js";

export function normalizeAssignment(assignment, assignmentIndex) {
  return {
    id: String(assignment.id || makeId(`assignment-${assignmentIndex}`)),
    title: String(assignment.title || "未命名作业"),
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
    status: [STATUS.NORMAL, STATUS.REGISTERED, STATUS.NONE].includes(student.status)
      ? student.status
      : STATUS.NORMAL,
    badge: String(student.badge || ""),
    badgeType: String(student.badgeType || ""),
    note: String(student.note || ""),
    updatedAt: student.updatedAt || ""
  };
}
