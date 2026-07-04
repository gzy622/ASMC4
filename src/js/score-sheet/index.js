import { hapticLight } from "../utils/haptics.js";
import { getCurrentAssignment, getState, saveAppState } from "../state.js";
import { scoreSheet, scoreDisplayValue, scoreNoteInput, scoreNoteClear, scoreStudentSerial, scoreStudentName } from "../dom-refs.js";
import { currentScoringStudent, setCurrentScoringStudent, setScoreInputValue, setNoteInputValue, setSuppressNextCardClick, scoreInputValue, scoreStep10Mode, noteInputValue } from "../runtime.js";
import { syncScoreStep10Ui } from "./score-step10-ui.js";
import { getDisplayName } from "../utils/display.js";
import { scheduleRender } from "../render/index.js";
import { announce } from "../utils/dom.js";
import { STATUS } from "../constants.js";
import { clampStudentNote } from "../utils/data-limits.js";
import { traceEvent } from "../utils/trace.js";

let releaseScoreSheetPointerGuard = null;

export function openScoreSheet(student, guardPointer = false) {
  traceEvent("scoreSheet.open", {
    studentId: String(student.id),
    serial: student.serial,
    status: student.status
  });
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

  scoreNoteInput.value = noteInputValue;
  scoreNoteClear.classList.toggle("is-visible", noteInputValue.length > 0);

  updateScoreDisplay();

  hapticLight();
  scoreSheet.classList.add("is-open");
  scoreSheet.setAttribute("aria-hidden", "false");
  if (guardPointer) armScoreSheetPointerGuard();
}

export function closeScoreSheet() {
  traceEvent("scoreSheet.close");
  clearScoreSheetPointerGuard();
  setSuppressNextCardClick(false);
  setCurrentScoringStudent(null);
  setScoreInputValue("0");
  setNoteInputValue("");
  scoreStudentSerial.textContent = "--";
  scoreStudentName.textContent = "--";
  scoreNoteInput.value = "";
  scoreNoteClear.classList.remove("is-visible");
  scoreSheet.classList.remove("is-open");
  scoreSheet.setAttribute("aria-hidden", "true");
}

export function updateScoreDisplay() {
  scoreDisplayValue.textContent = scoreInputValue;
}

export function confirmScore() {
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

  hapticLight();
  currentScoringStudent.updatedAt = new Date().toISOString();

  let message = "已保存备注";
  if (!hasScore && !trimmedNote) message = "已清空分数";
  else if (hasScore && !trimmedNote) message = "已保存分数";
  else if (hasScore && trimmedNote) message = "已保存分数和备注";

  const assignment = getCurrentAssignment();
  const studentIndex = assignment.students.findIndex(s => String(s.id) === String(currentScoringStudent.id));
  const displayName = getDisplayName(currentScoringStudent, studentIndex >= 0 ? studentIndex : 0);
  saveAppState({ label: `${displayName}：${message}`, assignmentId: assignment.id });
  scheduleRender();
  closeScoreSheet();

  announce(message, { action: "undo", assignmentId: assignment.id });
}

export function toggleScoreStep10Mode() {
  const next = !scoreStep10Mode;
  syncScoreStep10Ui(next);
  getState().scoreStep10Mode = next;
  saveAppState({ history: false });
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
