import { scoreTensBtn, scoreNumpad } from "../dom-refs.js";
import { setScoreTensMode } from "../runtime.js";

export function syncScoreTensUi(enabled) {
  setScoreTensMode(enabled);
  scoreTensBtn.classList.toggle("is-on", enabled);

  scoreNumpad.querySelectorAll(".numpad-btn").forEach(btn => {
    if (btn.dataset.action) return;
    const digit = btn.dataset.value;
    btn.textContent = enabled
      ? (digit === "0" ? "100" : String(parseInt(digit, 10) * 10))
      : digit;
  });
}
