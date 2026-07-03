let pendingConfirmAction = null;
let currentScoringStudent = null;
let scoreInputValue = "0";
let scoreStep10Mode = false;
let noteInputValue = "";
const longPressTimers = new Map();
let longPressTriggered = false;
let suppressNextCardClick = false;

let uiTransitionBusy = false;
let pointerDirectionLock = null;
let pointerDirectionLockId = null;

export {
  pendingConfirmAction,
  currentScoringStudent,
  scoreInputValue,
  scoreStep10Mode,
  noteInputValue,
  longPressTimers,
  longPressTriggered,
  suppressNextCardClick,
  uiTransitionBusy
};

export function setPendingConfirmAction(value) { pendingConfirmAction = value; }
export function setCurrentScoringStudent(value) { currentScoringStudent = value; }
export function setScoreInputValue(value) { scoreInputValue = value; }
export function setScoreStep10Mode(value) { scoreStep10Mode = value; }
export function setNoteInputValue(value) { noteInputValue = value; }
export function setLongPressTimer(pointerId, timerId) {
  if (timerId == null) longPressTimers.delete(pointerId);
  else longPressTimers.set(pointerId, timerId);
}
export function clearLongPressTimer(pointerId) {
  const timerId = longPressTimers.get(pointerId);
  if (timerId) clearTimeout(timerId);
  longPressTimers.delete(pointerId);
}
export function clearAllLongPressTimers() {
  longPressTimers.forEach(timerId => clearTimeout(timerId));
  longPressTimers.clear();
}
export function setLongPressTriggered(value) { longPressTriggered = value; }
export function setSuppressNextCardClick(value) { suppressNextCardClick = value; }
export function setUiTransitionBusy(value) { uiTransitionBusy = value; }
export function claimDirection(pointerId, dir) {
  if (pointerDirectionLockId !== null && pointerDirectionLockId !== pointerId) {
    return null;
  }
  if (pointerDirectionLock === null) {
    pointerDirectionLock = dir;
    pointerDirectionLockId = pointerId;
  }
  return pointerDirectionLock;
}
export function releaseDirection(pointerId) {
  if (pointerDirectionLockId === pointerId) {
    pointerDirectionLock = null;
    pointerDirectionLockId = null;
  }
}
