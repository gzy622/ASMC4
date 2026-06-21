import { scoreSheet } from "../dom-refs.js";
import { closeScoreSheet } from "../score-sheet/index.js";

let scoreSwipeStartY = null;
let scoreSwipeStartX = null;

scoreSheet.addEventListener("touchstart", (event) => {
  const touch = event.touches[0];
  scoreSwipeStartY = touch.clientY;
  scoreSwipeStartX = touch.clientX;
}, { passive: true });

scoreSheet.addEventListener("touchend", (event) => {
  if (scoreSwipeStartY === null) return;
  const touch = event.changedTouches[0];
  const dy = touch.clientY - scoreSwipeStartY;
  const dx = touch.clientX - scoreSwipeStartX;
  scoreSwipeStartY = null;
  scoreSwipeStartX = null;

  if (dy < 80) return;
  if (dy < Math.abs(dx) * 1.5) return;
  closeScoreSheet();
});

scoreSheet.addEventListener("touchcancel", () => {
  scoreSwipeStartY = null;
  scoreSwipeStartX = null;
});
