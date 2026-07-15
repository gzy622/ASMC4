import { hapticLight } from "../utils/haptics.js";
import { getCurrentAssignment, getState, saveAppState } from "../state.js";
import { scoreSheet, layerScrim, scoreDisplayValue, scoreNoteInput, scoreNoteClear, scoreStudentSerial, scoreStudentName, scoreCancel, scoreConfirm, scoreReset } from "../dom-refs.js";
import { currentScoringStudent, setCurrentScoringStudent, setScoreInputValue, setNoteInputValue, setSuppressNextCardClick, scoreInputValue, noteInputValue, pendingInstantScoreChange, pendingInstantScoreChangeMessage, setPendingInstantScoreChange } from "../runtime.js";
import { syncScoreStep10Ui } from "./score-step10-ui.js";
import { getDisplayName } from "../utils/display.js";
import { scheduleRender } from "../render/index.js";
import { announce } from "../utils/dom.js";
import { STATUS } from "../constants.js";
import { clampStudentNote } from "../utils/data-limits.js";
import { traceEvent } from "../utils/trace.js";
import { SCORE_SHEET_MOTION_DURATION_SCALE } from "../gestures/constants.js";
import { createInteractiveLayerController } from "../gestures/interactive-layer-controller.js";

let releaseScoreSheetPointerGuard = null;

let cachedScoreSheetHeight = scoreSheet.offsetHeight;

if (typeof ResizeObserver === "function") {
  const scoreSheetObserver = new ResizeObserver(entries => {
    const h = scoreSheet.offsetHeight;
    if (Number.isFinite(h) && h > 0) cachedScoreSheetHeight = h;
  });
  scoreSheetObserver.observe(scoreSheet);
}

function closedScoreSheetPx() {
  return cachedScoreSheetHeight;
}

function setScoreSheetOpenPressure(pressure) {
  if (pressure <= 0) {
    scoreSheet.style.removeProperty("--open-pressure-offset");
    scoreSheet.style.removeProperty("--open-pressure-scale");
    return;
  }
  scoreSheet.style.setProperty("--open-pressure-offset", `${pressure * -3}px`);
  scoreSheet.style.setProperty("--open-pressure-scale", String(1 - pressure * 0.12));
}

function resetScoreSheetState() {
  setPendingInstantScoreChange(false);
  setCurrentScoringStudent(null);
  setScoreInputValue("0");
  setNoteInputValue("");
  scoreStudentSerial.textContent = "--";
  scoreStudentName.textContent = "--";
  scoreNoteInput.value = "";
  scoreNoteClear.classList.remove("is-visible");
}

export const scoreSheetController = createInteractiveLayerController({
  stateEl: scoreSheet,
  axis: "y",
  getClosedPx: closedScoreSheetPx,
  scrimEl: layerScrim,
  busyKey: "sheet",
  traceLabel: "scoreSheet.motion",
  durationScale: SCORE_SHEET_MOTION_DURATION_SCALE,
  onOpenPressure: setScoreSheetOpenPressure,
  onBeforeClose() {
    clearScoreSheetPointerGuard();
    setSuppressNextCardClick(false);
  },
  onClosed() {
    finalizePendingInstantScoreChange();
    resetScoreSheetState();
  },
});

export function openScoreSheet(student, guardPointer = false) {
  traceEvent("scoreSheet.open", {
    studentId: String(student.id),
    serial: student.serial,
    status: student.status
  });
  setPendingInstantScoreChange(false);
  setCurrentScoringStudent(student);

  const assignment = getCurrentAssignment();
  const studentIndex = assignment.students.findIndex(s => String(s.id) === String(student.id));
  scoreStudentSerial.textContent = student.serial;
  scoreStudentName.textContent = getDisplayName(student, studentIndex >= 0 ? studentIndex : 0);

  if (student.badgeType === "note") {
    setNoteInputValue(student.note || student.badge || "");
    setScoreInputValue("0");
  } else {
    setNoteInputValue(student.note || "");
    const existingScore = student.badgeType === "score" ? student.badge : "0";
    setScoreInputValue(existingScore || "0");
  }

  syncScoreStep10Ui(getState().scoreStep10Mode);
  syncInstantScoringUi();

  scoreNoteInput.value = noteInputValue;
  scoreNoteClear.classList.toggle("is-visible", noteInputValue.length > 0);

  updateScoreDisplay();

  hapticLight();
  scoreSheetController.open();
  if (guardPointer) armScoreSheetPointerGuard();
}

export function closeScoreSheet({ animate = true } = {}) {
  traceEvent("scoreSheet.close");
  clearScoreSheetPointerGuard();
  setSuppressNextCardClick(false);

  if (scoreSheetController.phase === "closed") {
    resetScoreSheetState();
    return;
  }
  scoreSheetController.close({ animate });
}

export function updateScoreDisplay() {
  scoreDisplayValue.textContent = scoreInputValue;
}

export function syncInstantScoringUi() {
  const isInstant = getState().instantScoringMode;
  scoreSheet.classList.toggle("is-instant-scoring", isInstant);
  scoreCancel.hidden = isInstant;
  scoreConfirm.hidden = isInstant;
  scoreReset.hidden = !isInstant;
}

function applyScore({ close = false, history = true, haptic = true, toast = true } = {}) {
  if (!currentScoringStudent) return;

  traceEvent("scoreSheet.confirm", {
    studentId: String(currentScoringStudent.id),
    serial: currentScoringStudent.serial
  });

  const score = parseFloat(scoreInputValue);
  const hasScore = !(isNaN(score) || score <= 0);
  if (isNaN(score) || score <= 0) {
    currentScoringStudent.badge = "";
    currentScoringStudent.badgeType = "";
    currentScoringStudent.status = STATUS.NORMAL;
  } else {
    const rounded = Math.round(score * 100) / 100;
    currentScoringStudent.badge = String(rounded);
    currentScoringStudent.badgeType = "score";
    currentScoringStudent.status = STATUS.SUBMITTED;
  }

  const trimmedNote = clampStudentNote(noteInputValue.trim());
  currentScoringStudent.note = trimmedNote || "";

  if (haptic) hapticLight();
  currentScoringStudent.updatedAt = new Date().toISOString();

  const message = getScoreChangeMessage(hasScore, trimmedNote);

  const assignment = getCurrentAssignment();
  const studentIndex = assignment.students.findIndex(s => String(s.id) === String(currentScoringStudent.id));
  const displayName = getDisplayName(currentScoringStudent, studentIndex >= 0 ? studentIndex : 0);
  saveAppState({ history, label: `${displayName}：${message}`, assignmentId: assignment.id });
  scheduleRender();
  if (close) closeScoreSheet({ animate: false });

  if (toast) announce(message, history ? { action: "undo", assignmentId: assignment.id } : undefined);

  return { message, assignmentId: assignment.id, displayName };
}

function getScoreChangeMessage(hasScore, trimmedNote) {
  if (!hasScore && !trimmedNote) return "已清空分数";
  if (hasScore && !trimmedNote) return "已保存分数";
  if (hasScore && trimmedNote) return "已保存分数和备注";
  return "已保存备注";
}

function finalizePendingInstantScoreChange() {
  if (!pendingInstantScoreChange || !currentScoringStudent) return;

  const assignment = getCurrentAssignment();
  const studentIndex = assignment.students.findIndex(s => String(s.id) === String(currentScoringStudent.id));
  const displayName = getDisplayName(currentScoringStudent, studentIndex >= 0 ? studentIndex : 0);
  const message = pendingInstantScoreChangeMessage || "已保存分数";

  currentScoringStudent.updatedAt = new Date().toISOString();
  setPendingInstantScoreChange(false);
  saveAppState({ label: `${displayName}：${message}`, assignmentId: assignment.id });
  scheduleRender();
  announce(message, { action: "undo", assignmentId: assignment.id });
}

export function confirmScore() {
  applyScore({ close: true });
}

export function saveInstantScore({ message = "" } = {}) {
  if (!getState().instantScoringMode) return;
  const result = applyScore({ history: false, haptic: false, toast: false });
  if (result) setPendingInstantScoreChange(true, message || result.message);
}

export function resetInstantScore() {
  if (!currentScoringStudent) return;
  setScoreInputValue("0");
  setNoteInputValue("");
  scoreNoteInput.value = "";
  scoreNoteClear.classList.remove("is-visible");
  updateScoreDisplay();
  saveInstantScore({ message: "已重置分数和备注" });
}


function armScoreSheetPointerGuard() {
  clearScoreSheetPointerGuard();
  scoreSheet.classList.add("is-pointer-guarded");

  const releaseGuard = () => {
    window.removeEventListener("pointerup", releaseGuard, true);
    window.removeEventListener("pointercancel", releaseGuard, true);
    releaseScoreSheetPointerGuard = null;
    setTimeout(clearScoreSheetPointerGuard, 180);
  };

  releaseScoreSheetPointerGuard = releaseGuard;
  window.addEventListener("pointerup", releaseGuard, true);
  window.addEventListener("pointercancel", releaseGuard, true);
}

function clearScoreSheetPointerGuard() {
  if (releaseScoreSheetPointerGuard) {
    window.removeEventListener("pointerup", releaseScoreSheetPointerGuard, true);
    window.removeEventListener("pointercancel", releaseScoreSheetPointerGuard, true);
    releaseScoreSheetPointerGuard = null;
  }

  scoreSheet.classList.remove("is-pointer-guarded");
}
