let pendingConfirmAction = null;
let scoreSheetStudent = null;
let scoreInputValue = "0";
let scoreTensMode = false;
let noteInputValue = "";
let longPressTimer = null;
let longPressTriggered = false;
let suppressNextCardClick = false;

export {
  pendingConfirmAction,
  scoreSheetStudent,
  scoreInputValue,
  scoreTensMode,
  noteInputValue,
  longPressTimer,
  longPressTriggered,
  suppressNextCardClick
};

export function setPendingConfirmAction(val) { pendingConfirmAction = val; }
export function setScoreSheetStudent(val) { scoreSheetStudent = val; }
export function setScoreInputValue(val) { scoreInputValue = val; }
export function setScoreTensMode(val) { scoreTensMode = val; }
export function setNoteInputValue(val) { noteInputValue = val; }
export function setLongPressTimer(val) { longPressTimer = val; }
export function setLongPressTriggered(val) { longPressTriggered = val; }
export function setSuppressNextCardClick(val) { suppressNextCardClick = val; }
