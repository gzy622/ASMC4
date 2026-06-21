let pendingConfirmAction = null;
let scoreSheetStudent = null;
let scoreInputValue = "0";
let scoreTensMode = false;
let noteInputValue = "";
let longPressTimer = null;
let longPressTriggered = false;
let scoreSwipeStartY = null;
let scoreSwipeStartX = null;
let phoneSwipeStartX = null;
let phoneSwipeStartY = null;
let phoneSwipeGestureActive = false;
let suppressNextCardClick = false;
let drawerSwipeStartX = null;
let drawerSwipeStartY = null;

export { pendingConfirmAction, scoreSheetStudent, scoreInputValue, scoreTensMode, noteInputValue, longPressTimer, longPressTriggered, scoreSwipeStartY, scoreSwipeStartX, phoneSwipeStartX, phoneSwipeStartY, phoneSwipeGestureActive, suppressNextCardClick, drawerSwipeStartX, drawerSwipeStartY };

export function setPendingConfirmAction(val) { pendingConfirmAction = val; }
export function setScoreSheetStudent(val) { scoreSheetStudent = val; }
export function setScoreInputValue(val) { scoreInputValue = val; }
export function setScoreTensMode(val) { scoreTensMode = val; }
export function setNoteInputValue(val) { noteInputValue = val; }
export function setLongPressTimer(val) { longPressTimer = val; }
export function setLongPressTriggered(val) { longPressTriggered = val; }
export function setSuppressNextCardClick(val) { suppressNextCardClick = val; }
export function setScoreSwipeStartY(val) { scoreSwipeStartY = val; }
export function setScoreSwipeStartX(val) { scoreSwipeStartX = val; }
export function setPhoneSwipeStartX(val) { phoneSwipeStartX = val; }
export function setPhoneSwipeStartY(val) { phoneSwipeStartY = val; }
export function setPhoneSwipeGestureActive(val) { phoneSwipeGestureActive = val; }
export function setDrawerSwipeStartX(val) { drawerSwipeStartX = val; }
export function setDrawerSwipeStartY(val) { drawerSwipeStartY = val; }
