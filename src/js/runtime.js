let pendingConfirmAction = null;
let scoreSheetStudent = null;
let scoreInputValue = "0";
let scoreTensMode = false;
let noteInputValue = "";
const longPressTimers = new Map();
let longPressTriggered = false;
let suppressNextCardClick = false;

let drawerPanelTransitionBusy = false;
let pointerDirectionLock = null;
let pointerDirectionLockId = null;

export {
  pendingConfirmAction,
  scoreSheetStudent,
  scoreInputValue,
  scoreTensMode,
  noteInputValue,
  longPressTimers,
  longPressTriggered,
  suppressNextCardClick,
  drawerPanelTransitionBusy
};

export function setPendingConfirmAction(val) { pendingConfirmAction = val; }
export function setScoreSheetStudent(val) { scoreSheetStudent = val; }
export function setScoreInputValue(val) { scoreInputValue = val; }
export function setScoreTensMode(val) { scoreTensMode = val; }
export function setNoteInputValue(val) { noteInputValue = val; }
export function setLongPressTimer(pointerId, val) {
  if (val == null) longPressTimers.delete(pointerId);
  else longPressTimers.set(pointerId, val);
}
export function clearLongPressTimer(pointerId) {
  const t = longPressTimers.get(pointerId);
  if (t) clearTimeout(t);
  longPressTimers.delete(pointerId);
}
export function clearAllLongPressTimers() {
  longPressTimers.forEach(t => clearTimeout(t));
  longPressTimers.clear();
}
export function setLongPressTriggered(val) { longPressTriggered = val; }
export function setSuppressNextCardClick(val) { suppressNextCardClick = val; }
export function setDrawerPanelTransitionBusy(val) { drawerPanelTransitionBusy = val; }
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
