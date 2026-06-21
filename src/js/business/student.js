import { saveAppState, getState, getCurrentAssignment } from "../state.js";
import { STATUS } from "../constants.js";
import { render } from "../render/index.js";
import { announce } from "../utils/dom.js";

export function toggleStudent(student) {
  if (student.status === STATUS.NONE) return;

  student.status = student.status === STATUS.REGISTERED ? STATUS.NORMAL : STATUS.REGISTERED;

  if (student.badgeType === "submit") {
    student.badge = "";
    student.badgeType = "";
  }

  student.updatedAt = new Date().toISOString();
  saveAppState();
  render();
  announce(student.status === STATUS.REGISTERED ? "已设为已交" : "已设为未交");
}

export function toggleScoringMode() {
  const state = getState();
  state.scoringMode = !state.scoringMode;
  saveAppState();
  render();
  announce(state.scoringMode ? "已开启打分模式，点击卡片即可打分" : "已关闭打分模式，长按卡片可打分");
}
