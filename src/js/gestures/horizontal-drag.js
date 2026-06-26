import { DRAG_START_THRESHOLD, DRAG_SLOPE } from "./constants.js";

export function createHorizontalDragGesture(bindEl, {
  targetEl,
  getClosedPx,
  getBasePx = () => 0,
  shouldStart = () => true,
  onTrackMove,
  shouldContinueMove = () => true,
  onRelease,
}) {
  let startX = null;
  let startY = null;
  let dragging = false;

  bindEl.addEventListener("touchstart", (event) => {
    if (!shouldStart(event)) return;
    const touch = event.touches[0];
    startX = touch.clientX;
    startY = touch.clientY;
    dragging = false;
  }, { passive: true });

  bindEl.addEventListener("touchmove", (event) => {
    if (startX === null) return;
    if (!shouldContinueMove(event)) {
      startX = null;
      startY = null;
      dragging = false;
      return;
    }
    const touch = event.touches[0];
    const dx = touch.clientX - startX;
    const dy = touch.clientY - startY;

    if (onTrackMove) onTrackMove(dx, dy);

    if (Math.abs(dx) > 2 && Math.abs(dx) > Math.abs(dy)) {
      event.preventDefault();
    }

    if (!dragging) {
      if (Math.abs(dx) > DRAG_START_THRESHOLD && Math.abs(dx) > Math.abs(dy) * DRAG_SLOPE) {
        dragging = true;
        targetEl.style.transition = "none";
        startX = touch.clientX;
        startY = touch.clientY;
      }
      return;
    }

    const closedPx = getClosedPx();
    const basePx = getBasePx();
    const clamped = Math.max(closedPx, Math.min(0, basePx + dx));
    targetEl.style.transform = `translateX(${clamped}px)`;
    event.preventDefault();
  }, { passive: false });

  bindEl.addEventListener("touchend", (event) => {
    if (startX === null) return;
    if (!shouldContinueMove(event)) {
      startX = null;
      startY = null;
      dragging = false;
      return;
    }
    const touch = event.changedTouches[0];
    const dx = touch.clientX - startX;
    const wasDragging = dragging;

    startX = null;
    startY = null;
    dragging = false;

    if (wasDragging) {
      targetEl.style.transition = "";
      targetEl.style.transform = "";
      if (onRelease) onRelease(dx, wasDragging);
    }
  });

  bindEl.addEventListener("touchcancel", () => {
    if (dragging) {
      targetEl.style.transition = "";
      targetEl.style.transform = "";
    }
    startX = null;
    startY = null;
    dragging = false;
  });
}
