import { saveAppState, getState, getCurrentAssignment } from "../state.js";
import { STATUS } from "../constants.js";
import { isStudentForceNone, getStateClass } from "../utils/display.js";
import { render } from "../render/index.js";
import { renderProgress } from "../render/progress.js";
import { renderScoringMode } from "../render/scoringMode.js";
import { renderHistoryButtons } from "../render/quickPanel.js";
import { announce } from "../utils/dom.js";
import { hapticLight } from "../utils/haptics.js";

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
  hapticLight();

  const state = getState();
  const assignment = getCurrentAssignment();
  const newClass = getStateClass(student, assignment);

  if (cardEl) {
    cardEl.className = `student-card ${newClass}`;
  }

  renderProgress(state, assignment);
  renderScoringMode(state);
  renderHistoryButtons();
  announce(student.status === STATUS.REGISTERED ? "已设为已交" : "已设为未交", { action: "undo" });
}

export function toggleScoringMode() {
  const state = getState();
  state.scoringMode = !state.scoringMode;
  saveAppState({ history: false });
  render();
  announce(state.scoringMode ? "打分模式已开启" : "打分模式已关闭");
}
