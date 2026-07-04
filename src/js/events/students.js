import {
  studentGrid,
  scoringToggle
} from "../dom-refs.js";
import { STATUS } from "../constants.js";
import { getCurrentAssignment, getState } from "../state.js";
import {
  longPressTimers,
  longPressTriggered,
  setLongPressTriggered,
  setSuppressNextCardClick,
  suppressNextCardClick
} from "../runtime.js";
import { toggleStudent } from "../business/student.js";
import { toggleScoringMode } from "../business/settings.js";
import { openScoreSheet } from "../score-sheet/index.js";
import { handleLongPressEnd, handleLongPressMove, handleLongPressStart } from "../score-sheet/longpress.js";
import { isStudentForceNone } from "../utils/display.js";
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
      toggleStudent(student);
    }
  });

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
