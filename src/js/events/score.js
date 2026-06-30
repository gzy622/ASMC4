import {
  scoreCancel,
  scoreConfirm,
  scoreNoteClear,
  scoreNoteInput,
  scoreNumpad,
  scoreSheet
} from "../dom-refs.js";
import {
  noteInputValue,
  scoreInputValue,
  scoreTensMode,
  setNoteInputValue,
  setScoreInputValue
} from "../runtime.js";
import { hapticSelection } from "../utils/haptics.js";
import {
  closeScoreSheet,
  confirmScore,
  toggleTensMode,
  updateScoreDisplay
} from "../score-sheet/index.js";

export function bindScoreEvents() {
  scoreCancel.addEventListener("click", closeScoreSheet);
  scoreConfirm.addEventListener("click", confirmScore);
  scoreSheet.addEventListener("selectstart", event => {
    const target = event.target instanceof Element ? event.target : null;
    if (target === scoreNoteInput || target?.closest("#scoreNoteInput")) return;
    event.preventDefault();
  });

  scoreNoteInput.addEventListener("input", () => {
    setNoteInputValue(scoreNoteInput.value);
    scoreNoteClear.classList.toggle("is-visible", noteInputValue.length > 0);
  });

  scoreNoteClear.addEventListener("click", () => {
    scoreNoteInput.value = "";
    setNoteInputValue("");
    scoreNoteClear.classList.remove("is-visible");
    scoreNoteInput.focus();
  });

  scoreNumpad.addEventListener("click", event => {
    const button = event.target.closest(".numpad-btn");
    if (!button) return;

    hapticSelection();

    const { value, action } = button.dataset;

    if (value !== undefined) {
      if (scoreTensMode) {
        setScoreInputValue(value === "0" ? "100" : String(Number(value) * 10));
        confirmScore();
        return;
      } else if (scoreInputValue === "0") {
        setScoreInputValue(value);
      } else if (scoreInputValue.length < 3) {
        setScoreInputValue(scoreInputValue + value);
      }
    } else if (action === "backspace") {
      setScoreInputValue(
        scoreInputValue.length > 1 ? scoreInputValue.slice(0, -1) : "0"
      );
    } else if (action === "tens") {
      toggleTensMode();
    }

    updateScoreDisplay();
  });
}
