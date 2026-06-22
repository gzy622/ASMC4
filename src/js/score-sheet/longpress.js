import { getCurrentAssignment } from "../state.js";
import { STATUS, LONG_PRESS_MS } from "../constants.js";
import {
  longPressTimer,
  longPressTriggered,
  setLongPressTimer,
  setLongPressTriggered
} from "../runtime.js";
import { isStudentForceNone } from "../utils/display.js";
import { openScoreSheet } from "./index.js";

let longPressResetTimer = null;

export function handleLongPressStart(event) {
  const card = event.target.closest(".student-card");
  if (!card) return;

  const assignment = getCurrentAssignment();
  const student = assignment.students.find(item => String(item.id) === card.dataset.id);
  if (!student || student.status === STATUS.NONE) return;
  if (isStudentForceNone(student, assignment)) return;

  setLongPressTimer(setTimeout(() => {
    setLongPressTimer(null);
    setLongPressTriggered(true);
    clearTimeout(longPressResetTimer);
    longPressResetTimer = setTimeout(() => {
      setLongPressTriggered(false);
      longPressResetTimer = null;
    }, 800);
    openScoreSheet(student);
  }, LONG_PRESS_MS));
}

export function handleLongPressEnd() {
  if (longPressTimer) {
    clearTimeout(longPressTimer);
    setLongPressTimer(null);
  }

  if (longPressTriggered) {
    clearTimeout(longPressResetTimer);
    longPressResetTimer = setTimeout(() => {
      setLongPressTriggered(false);
      longPressResetTimer = null;
    }, 500);
  }
}
