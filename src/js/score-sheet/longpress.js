import { getCurrentAssignment } from "../state.js";
import { STATUS, LONG_PRESS_MS } from "../constants.js";
import { longPressTimer, setLongPressTimer, setLongPressTriggered } from "../runtime.js";
import { openScoreSheet } from "./index.js";

export function handleLongPressStart(event) {
  const card = event.target.closest(".student-card");
  if (!card) return;

  const assignment = getCurrentAssignment();
  const student = assignment.students.find(item => String(item.id) === card.dataset.id);
  if (!student || student.status === STATUS.NONE) return;

  setLongPressTimer(setTimeout(() => {
    setLongPressTimer(null);
    setLongPressTriggered(true);
    openScoreSheet(student);
  }, LONG_PRESS_MS));
}

export function handleLongPressEnd() {
  if (longPressTimer) {
    clearTimeout(longPressTimer);
    setLongPressTimer(null);
  }
  setLongPressTriggered(false);
}
