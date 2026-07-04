import { saveAppState, getState, getCurrentAssignment } from "../state.js";
import { STATUS } from "../constants.js";
import { isStudentForceNone, getDisplayName } from "../utils/display.js";
import { scheduleRender } from "../render/index.js";
import { announce } from "../utils/dom.js";
import { hapticLight } from "../utils/haptics.js";
import { traceStep } from "../utils/trace.js";

export function toggleStudent(student) {
  if (student.status === STATUS.NONE) {
    traceStep("toggleStudent", { skipped: true, reason: "none", studentId: String(student.id) });
    return;
  }
  if (isStudentForceNone(student, getCurrentAssignment())) {
    traceStep("toggleStudent", { skipped: true, reason: "forceNone", studentId: String(student.id) });
    return;
  }

  const prevStatus = student.status;
  student.status = student.status === STATUS.SUBMITTED ? STATUS.NORMAL : STATUS.SUBMITTED;
  traceStep("toggleStudent", {
    studentId: String(student.id),
    serial: student.serial,
    fromStatus: prevStatus,
    toStatus: student.status
  });

  if (student.status !== STATUS.SUBMITTED && (student.badgeType === "submit" || student.badgeType === "score")) {
    student.badge = "";
    student.badgeType = "";
  }

  student.updatedAt = new Date().toISOString();

  const assignment = getCurrentAssignment();
  const studentIndex = assignment.students.findIndex(s => String(s.id) === String(student.id));
  const displayName = getDisplayName(student, studentIndex >= 0 ? studentIndex : 0);
  const statusLabel = student.status === STATUS.SUBMITTED ? "已交" : "未交";
  saveAppState({ label: `${student.serial}号 ${displayName} 设为${statusLabel}`, assignmentId: assignment.id });
  hapticLight();
  scheduleRender();
  announce(student.status === STATUS.SUBMITTED ? "已设为已交" : "已设为未交", { action: "undo", assignmentId: assignment.id });
}
