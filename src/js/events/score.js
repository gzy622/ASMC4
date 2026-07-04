import {
  scoreBackspaceBtn,
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
  setNoteInputValue,
  setScoreInputValue
} from "../runtime.js";
import { getState } from "../state.js";
import { hapticSelection } from "../utils/haptics.js";
import { toggleScoreStep10ModeFromSheet } from "../business/settings.js";
import {
  closeScoreSheet,
  confirmScore,
  updateScoreDisplay
} from "../score-sheet/index.js";
import { traceEvent } from "../utils/trace.js";

export function bindScoreEvents() {
  scoreCancel.addEventListener("click", () => {
    traceEvent("score.cancel");
    closeScoreSheet();
  });
  scoreConfirm.addEventListener("click", () => {
    traceEvent("score.confirm");
    confirmScore();
  });
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
    traceEvent("score.numpad", { value, action });

    if (value !== undefined) {
      if (getState().scoreStep10Mode) {
        setScoreInputValue(value === "0" ? "100" : String(Number(value) * 10));
        confirmScore();
        return;
      }
      const dotIndex = scoreInputValue.indexOf(".");
      if (dotIndex === -1) {
        if (scoreInputValue === "0") {
          setScoreInputValue(value);
        } else if (scoreInputValue.length < 3) {
          setScoreInputValue(scoreInputValue + value);
        }
      } else if (scoreInputValue.length - dotIndex - 1 < 2) {
        setScoreInputValue(scoreInputValue + value);
      }
    } else if (action === "decimal") {
      if (!getState().scoreStep10Mode && !scoreInputValue.includes(".")) {
        setScoreInputValue(scoreInputValue + ".");
      }
    } else if (action === "tens") {
      toggleScoreStep10ModeFromSheet();
    }

    updateScoreDisplay();
  });

  scoreBackspaceBtn.addEventListener("click", () => {
    traceEvent("score.backspace");
    hapticSelection();
    setScoreInputValue(
      scoreInputValue.length > 1 ? scoreInputValue.slice(0, -1) : "0"
    );
    updateScoreDisplay();
  });
}
