import { saveAppState, getState, getCurrentAssignment } from "../state.js";
import { STATUS } from "../constants.js";
import { isStudentForceNone, getStateClass } from "../utils/display.js";
import { renderProgress } from "../render/progress.js";
import { renderScoringMode } from "../render/scoringMode.js";
import { announce } from "../utils/dom.js";

export function toggleStudent(student, cardEl) {
  if (student.status === STATUS.NONE) return;
  if (isStudentForceNone(student, getCurrentAssignment())) return;

  student.status = student.status === STATUS.REGISTERED ? STATUS.NORMAL : STATUS.REGISTERED;

  if (student.badgeType === "submit") {
    student.badge = "";
    student.badgeType = "";
  }

  student.updatedAt = new Date().toISOString();
  saveAppState();

  const state = getState();
  const assignment = getCurrentAssignment();
  const newClass = getStateClass(student, assignment);

  if (cardEl) {
    cardEl.className = `student-card ${newClass}`;
  }

  renderProgress(state, assignment);
  renderScoringMode(state);
  announce(student.status === STATUS.REGISTERED ? "已设为已交" : "已设为未交");
}

export function toggleScoringMode() {
  const state = getState();
  state.scoringMode = !state.scoringMode;
  saveAppState();
  render();
  announce(state.scoringMode ? "已开启打分模式，点击卡片即可打分" : "已关闭打分模式，长按卡片可打分");
}
