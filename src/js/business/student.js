import { saveAppState, getState, getCurrentAssignment } from "../state.js";
import { STATUS } from "../constants.js";
import { isStudentForceNone, getStateClass, getDisplayName } from "../utils/display.js";
import { scheduleRender } from "../render/index.js";
import { renderProgress } from "../render/progress.js";
import { refreshOpenQuickPanel } from "../render/quickPanel.js";
import { renderStudents } from "../render/students.js";
import { renderAssignmentList } from "../render/assignmentList.js";
import { announce } from "../utils/dom.js";
import { hapticLight, hapticSelection } from "../utils/haptics.js";

export function toggleStudent(student, cardEl) {
  if (student.status === STATUS.NONE) return;
  if (isStudentForceNone(student, getCurrentAssignment())) return;

  student.status = student.status === STATUS.SUBMITTED ? STATUS.NORMAL : STATUS.SUBMITTED;

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

  const state = getState();
  renderStudents(state, assignment);
  renderProgress(state, assignment);
  refreshOpenQuickPanel();
  renderAssignmentList(state);
  announce(student.status === STATUS.SUBMITTED ? "已设为已交" : "已设为未交", { action: "undo", assignmentId: assignment.id });
}

export function toggleScoringMode() {
  hapticSelection();
  const state = getState();
  state.scoringMode = !state.scoringMode;
  saveAppState({ history: false });
  scheduleRender();
  announce(state.scoringMode ? "打分模式已开启" : "打分模式已关闭");
}
