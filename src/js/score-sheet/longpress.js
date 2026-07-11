import { getCurrentAssignment } from "../state.js";
import { drawer } from "../dom-refs.js";
import { STATUS, LONG_PRESS_MS } from "../constants.js";
import {
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
const longPressCards = new Map();
const LONG_PRESS_MOVE_CANCEL_DISTANCE = 10;

function clearLongPressVisual(pointerId) {
  const card = longPressCards.get(pointerId);
  if (card) {
    card.classList.remove("is-longpressing");
    longPressCards.delete(pointerId);
  }
}

export function handleLongPressStart(event) {
  const card = event.target.closest(".student-card");
  if (!card) return;
  if (drawer.classList.contains("is-open")) return;

  setLongPressTriggered(false);
  clearTimeout(longPressResetTimer);
  longPressResetTimer = null;

  const assignment = getCurrentAssignment();
  const student = assignment.students.find(item => String(item.id) === card.dataset.id);
  if (!student || student.status === STATUS.NONE) return;
  if (isStudentForceNone(student, assignment)) return;

  const pointerId = event.pointerId;
  clearLongPressVisual(pointerId);
  longPressStarts.set(pointerId, { x: event.clientX, y: event.clientY });
  longPressCards.set(pointerId, card);
  card.classList.add("is-longpressing");
  setLongPressTimer(pointerId, setTimeout(() => {
    clearLongPressVisual(pointerId);
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
  clearLongPressVisual(event.pointerId);
}

export function handleLongPressEnd(event) {
  longPressStarts.delete(event.pointerId);
  clearLongPressTimer(event.pointerId);
  clearLongPressVisual(event.pointerId);

  if (longPressTriggered) {
    clearTimeout(longPressResetTimer);
    longPressResetTimer = setTimeout(() => {
      setLongPressTriggered(false);
      longPressResetTimer = null;
    }, 500);
  }
}
