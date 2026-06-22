import { grid, hideNameSwitch, settingsButton } from "../dom-refs.js";
import { STATUS } from "../constants.js";
import { getCurrentAssignment, getState, saveAppState } from "../state.js";
import {
  longPressTimer,
  longPressTriggered,
  setLongPressTriggered,
  setSuppressNextCardClick,
  suppressNextCardClick
} from "../runtime.js";
import { toggleScoringMode, toggleStudent } from "../business/student.js";
import { openScoreSheet } from "../score-sheet/index.js";
import { handleLongPressEnd, handleLongPressStart } from "../score-sheet/longpress.js";
import { isStudentForceNone } from "../utils/display.js";
import { render } from "../render/index.js";
import { announce } from "../utils/dom.js";

export function bindStudentEvents() {
  settingsButton.addEventListener("click", toggleScoringMode);

  grid.addEventListener("click", event => {
    const card = event.target.closest(".student-card");
    if (!card) return;

    if (suppressNextCardClick) {
      setSuppressNextCardClick(false);
      return;
    }

    if (longPressTriggered) {
      setLongPressTriggered(false);
      return;
    }

    const assignment = getCurrentAssignment();
    const student = assignment.students.find(
      item => String(item.id) === card.dataset.id
    );
    if (!student || student.status === STATUS.NONE) return;
    if (isStudentForceNone(student, assignment)) return;

    if (getState().scoringMode) {
      openScoreSheet(student);
    } else {
      toggleStudent(student);
    }
  });

  hideNameSwitch.addEventListener("click", () => {
    const state = getState();
    state.hideNames = !state.hideNames;
    saveAppState();
    render();
    announce(state.hideNames ? "已隐藏真实姓名" : "已显示真实姓名");
  });

  grid.addEventListener("pointerdown", handleLongPressStart);
  grid.addEventListener("pointerup", handleLongPressEnd);
  grid.addEventListener("pointercancel", handleLongPressEnd);
  grid.addEventListener("pointerleave", handleLongPressEnd);
  grid.addEventListener("contextmenu", event => {
    if (longPressTimer || longPressTriggered) event.preventDefault();
  });
}
