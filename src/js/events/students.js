import {
  studentGrid,
  showRealNameSwitch,
  quickShowRealNameSwitch,
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
import { scheduleRender } from "../render/index.js";
import { announce } from "../utils/dom.js";
import { hapticSelection } from "../utils/haptics.js";
import { traceEvent } from "../utils/trace.js";

export function bindStudentEvents() {
  scoringToggle.addEventListener("click", () => {
    traceEvent("student.scoringToggle");
    toggleScoringMode();
  });

  studentGrid.addEventListener("click", event => {
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

    traceEvent("student.card.click", {
      studentId: String(student.id),
      serial: student.serial,
      scoringMode: getState().scoringMode
    });

    if (getState().scoringMode) {
      openScoreSheet(student);
    } else {
      toggleStudent(student, card);
    }
  });

  function toggleShowRealNames() {
    traceEvent("student.showRealNames.toggle");
    hapticSelection();
    const state = getState();
    state.showRealNames = !state.showRealNames;
    saveAppState({ history: false });
    scheduleRender();
    announce(state.showRealNames ? "已显示姓名" : "已隐藏姓名");
  }

  function bindQuickSettingRow(rowEl, switchEl, toggleFn) {
    rowEl?.addEventListener("click", toggleFn);
    switchEl?.addEventListener("click", event => {
      event.stopPropagation();
      toggleFn();
    });
  }

  showRealNameSwitch?.addEventListener("click", toggleShowRealNames);
  bindQuickSettingRow(
    quickShowRealNameSwitch?.closest(".quick-setting-row"),
    quickShowRealNameSwitch,
    toggleShowRealNames
  );
  bindQuickSettingRow(
    quickScoringModeSwitch?.closest(".quick-setting-row"),
    quickScoringModeSwitch,
    toggleScoringMode
  );

  studentGrid.addEventListener("pointerdown", handleLongPressStart);
  studentGrid.addEventListener("pointermove", handleLongPressMove);
  studentGrid.addEventListener("pointerup", handleLongPressEnd);
  studentGrid.addEventListener("pointercancel", handleLongPressEnd);
  studentGrid.addEventListener("pointerleave", handleLongPressEnd);
  studentGrid.addEventListener("selectstart", event => {
    if (event.target.closest(".student-card")) event.preventDefault();
  });
  studentGrid.addEventListener("contextmenu", event => {
    if (longPressTimers.size > 0 || longPressTriggered) event.preventDefault();
  });
}
