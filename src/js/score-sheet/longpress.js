import { getCurrentAssignment } from "../state.js";
import { STATUS, LONG_PRESS_MS } from "../constants.js";
import {
  longPressTimers,
  longPressTriggered,
  setLongPressTimer,
  clearLongPressTimer,
  setLongPressTriggered,
  setSuppressNextCardClick
} from "../runtime.js";
import { isStudentForceNone } from "../utils/display.js";
import { openScoreSheet } from "./index.js";

let longPressResetTimer = null;
const longPressStarts = new Map();
const LONG_PRESS_MOVE_CANCEL_DISTANCE = 10;

export function handleLongPressStart(event) {
  const card = event.target.closest(".student-card");
  if (!card) return;

  setLongPressTriggered(false);
  clearTimeout(longPressResetTimer);
  longPressResetTimer = null;

  const assignment = getCurrentAssignment();
  const student = assignment.students.find(item => String(item.id) === card.dataset.id);
  if (!student || student.status === STATUS.NONE) return;
  if (isStudentForceNone(student, assignment)) return;

  const pointerId = event.pointerId;
  longPressStarts.set(pointerId, { x: event.clientX, y: event.clientY });
  setLongPressTimer(pointerId, setTimeout(() => {
    longPressStarts.delete(pointerId);
    setLongPressTimer(pointerId, null);
    setLongPressTriggered(true);
    setSuppressNextCardClick(true);
    clearTimeout(longPressResetTimer);
    longPressResetTimer = setTimeout(() => {
      setLongPressTriggered(false);
      longPressResetTimer = null;
    }, 800);
    openScoreSheet(student, true);
  }, LONG_PRESS_MS));
}

export function handleLongPressMove(event) {
  const start = longPressStarts.get(event.pointerId);
  if (!start) return;
  const dx = event.clientX - start.x;
  const dy = event.clientY - start.y;
  if (Math.hypot(dx, dy) < LONG_PRESS_MOVE_CANCEL_DISTANCE) return;
  longPressStarts.delete(event.pointerId);
  clearLongPressTimer(event.pointerId);
}

export function handleLongPressEnd(event) {
  longPressStarts.delete(event.pointerId);
  clearLongPressTimer(event.pointerId);

  if (longPressTriggered) {
    clearTimeout(longPressResetTimer);
    longPressResetTimer = setTimeout(() => {
      setLongPressTriggered(false);
      longPressResetTimer = null;
    }, 500);
  }
}
