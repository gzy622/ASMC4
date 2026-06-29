import {
  grid,
  hideNameSwitch,
  quickHideNameSwitch,
  quickScoringModeSwitch,
  scoringToggle
} from "../dom-refs.js";
import { STATUS } from "../constants.js";
import { getCurrentAssignment, getState, saveAppState } from "../state.js";
import {
  longPressTimers,
  longPressTriggered,
  setLongPressTriggered,
  setSuppressNextCardClick,
  suppressNextCardClick
} from "../runtime.js";
import { toggleScoringMode, toggleStudent } from "../business/student.js";
import { openScoreSheet } from "../score-sheet/index.js";
import { handleLongPressEnd, handleLongPressMove, handleLongPressStart } from "../score-sheet/longpress.js";
import { isStudentForceNone } from "../utils/display.js";
import { render } from "../render/index.js";
import { announce } from "../utils/dom.js";

export function bindStudentEvents() {
  scoringToggle.addEventListener("click", toggleScoringMode);

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
      toggleStudent(student, card);
    }
  });

  function toggleHideNames() {
    const state = getState();
    state.hideNames = !state.hideNames;
    saveAppState();
    render();
    announce(state.hideNames ? "已隐藏真实姓名" : "已显示真实姓名");
  }

  function bindQuickSettingRow(rowEl, switchEl, toggleFn) {
    rowEl?.addEventListener("click", toggleFn);
    switchEl?.addEventListener("click", event => {
      event.stopPropagation();
      toggleFn();
    });
  }

  hideNameSwitch?.addEventListener("click", toggleHideNames);
  bindQuickSettingRow(
    quickHideNameSwitch?.closest(".quick-setting-row"),
    quickHideNameSwitch,
    toggleHideNames
  );
  bindQuickSettingRow(
    quickScoringModeSwitch?.closest(".quick-setting-row"),
    quickScoringModeSwitch,
    toggleScoringMode
  );

  grid.addEventListener("pointerdown", handleLongPressStart);
  grid.addEventListener("pointermove", handleLongPressMove);
  grid.addEventListener("pointerup", handleLongPressEnd);
  grid.addEventListener("pointercancel", handleLongPressEnd);
  grid.addEventListener("pointerleave", handleLongPressEnd);
  grid.addEventListener("selectstart", event => {
    if (event.target.closest(".student-card")) event.preventDefault();
  });
  grid.addEventListener("contextmenu", event => {
    if (longPressTimers.size > 0 || longPressTriggered) event.preventDefault();
  });
}
