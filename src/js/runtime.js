import { traceStep } from "./utils/trace.js";

let pendingConfirmAction = null;
let currentScoringStudent = null;
let scoreInputValue = "0";
let noteInputValue = "";
const longPressTimers = new Map();
let longPressTriggered = false;
let suppressNextCardClick = false;
let pendingInstantScoreChange = false;
let pendingInstantScoreChangeMessage = "";
let quickPanelPrefersHistoryView = false;

const uiTransitionBusyKeys = new Set();
let pointerDirectionLock = null;
let pointerDirectionLockId = null;

export {
  pendingConfirmAction,
  currentScoringStudent,
  scoreInputValue,
  noteInputValue,
  longPressTimers,
  longPressTriggered,
  suppressNextCardClick,
  pendingInstantScoreChange,
  pendingInstantScoreChangeMessage
};

export function setPendingConfirmAction(value) { pendingConfirmAction = value; }
export function setCurrentScoringStudent(value) { currentScoringStudent = value; }
export function setScoreInputValue(value) { scoreInputValue = value; }
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
export function setPendingInstantScoreChange(value, message = "") {
  pendingInstantScoreChange = value;
  pendingInstantScoreChangeMessage = value ? message : "";
}
export function setQuickPanelPrefersHistoryView(value) { quickPanelPrefersHistoryView = value; }
export function isQuickPanelPrefersHistoryView() { return quickPanelPrefersHistoryView; }

export function setUiTransitionBusy(busy, key = "global") {
  const hadKey = uiTransitionBusyKeys.has(key);
  if (busy) {
    if (!hadKey) {
      uiTransitionBusyKeys.add(key);
      traceStep("uiTransitionBusy", { busy: true, busyKey: key });
    }
  } else if (hadKey) {
    uiTransitionBusyKeys.delete(key);
    traceStep("uiTransitionBusy", { busy: false, busyKey: key });
  }
}

export function isUiTransitionBusy(key) {
  if (key != null) return uiTransitionBusyKeys.has(key);
  return uiTransitionBusyKeys.size > 0;
}

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
