import { scoreStep10Button, scoreNumpad } from "../dom-refs.js";

export function syncScoreStep10Ui(enabled) {
  scoreStep10Button.classList.toggle("is-on", enabled);

  scoreNumpad.querySelectorAll(".numpad-btn").forEach(btn => {
    if (btn.dataset.action) return;
    const digit = btn.dataset.value;
    btn.textContent = enabled
      ? (digit === "0" ? "100" : String(parseInt(digit, 10) * 10))
      : digit;
  });
}
