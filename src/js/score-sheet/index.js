import { hapticLight } from "../utils/haptics.js";
import { getCurrentAssignment, getState, saveAppState } from "../state.js";
import { scoreSheet, scoreDisplay, scoreTensBtn, scoreNoteInput, scoreNoteClear, scoreStudentSerial, scoreStudentName, scoreNumpad } from "../dom-refs.js";
import { scoreSheetStudent, setScoreSheetStudent, setScoreInputValue, setScoreTensMode, setNoteInputValue, scoreInputValue, scoreTensMode, noteInputValue } from "../runtime.js";
import { getDisplayName } from "../utils/display.js";
import { render } from "../render/index.js";
import { announce } from "../utils/dom.js";
import { STATUS } from "../constants.js";

let releaseScoreSheetPointerGuard = null;

export function openScoreSheet(student, guardPointer = false) {
  setScoreSheetStudent(student);

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

  const restoredTens = getState().scoreTensMode;
  setScoreTensMode(restoredTens);
  scoreTensBtn.classList.toggle("is-on", restoredTens);
  updateNumpadLabels();

  scoreNoteInput.value = noteInputValue;
  scoreNoteClear.classList.toggle("is-visible", noteInputValue.length > 0);

  updateScoreDisplay();

  hapticLight();
  scoreSheet.classList.add("is-open");
  scoreSheet.setAttribute("aria-hidden", "false");
  if (guardPointer) armScoreSheetPointerGuard();
}

export function closeScoreSheet() {
  clearScoreSheetPointerGuard();
  setScoreSheetStudent(null);
  setScoreInputValue("0");
  setNoteInputValue("");
  scoreStudentSerial.textContent = "--";
  scoreStudentName.textContent = "--";
  scoreNoteInput.value = "";
  scoreNoteClear.classList.remove("is-visible");
  updateNumpadLabels();
  scoreSheet.classList.remove("is-open");
  scoreSheet.setAttribute("aria-hidden", "true");
}

export function updateScoreDisplay() {
  scoreDisplay.textContent = scoreInputValue;
}

export function confirmScore() {
  if (!scoreSheetStudent) return;

  const score = parseInt(scoreInputValue, 10);
  if (isNaN(score) || score <= 0) {
    scoreSheetStudent.badge = "";
    scoreSheetStudent.badgeType = "";
    scoreSheetStudent.status = STATUS.NORMAL;
  } else {
    scoreSheetStudent.badge = String(score);
    scoreSheetStudent.badgeType = "score";
    scoreSheetStudent.status = STATUS.REGISTERED;
  }

  const trimmedNote = noteInputValue.trim();
  scoreSheetStudent.note = trimmedNote || "";

  hapticLight();
  scoreSheetStudent.updatedAt = new Date().toISOString();
  saveAppState();
  render();
  const savedBadge = scoreSheetStudent.badge || "无";
  closeScoreSheet();
  announce(`已保存：分数 ${savedBadge}${trimmedNote ? `，备注 ${trimmedNote}` : ""}`);
}

export function toggleTensMode() {
  setScoreTensMode(!scoreTensMode);
  scoreTensBtn.classList.toggle("is-on", scoreTensMode);
  getState().scoreTensMode = scoreTensMode;
  saveAppState();
  updateNumpadLabels();
}

function updateNumpadLabels() {
  const buttons = scoreNumpad.querySelectorAll(".numpad-btn");
  buttons.forEach(btn => {
    if (btn.dataset.action) return;
    const digit = btn.dataset.value;
    if (scoreTensMode) {
      btn.textContent = digit === "0" ? "100" : String(parseInt(digit, 10) * 10);
    } else {
      btn.textContent = digit;
    }
  });
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
