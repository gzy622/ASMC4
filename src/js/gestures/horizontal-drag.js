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
  let pendingTransform = null;
  let rafId = null;

  function scheduleTransform(value) {
    pendingTransform = value;
    if (rafId === null) {
      rafId = requestAnimationFrame(() => {
        rafId = null;
        if (pendingTransform !== null) {
          targetEl.style.transform = pendingTransform;
          pendingTransform = null;
        }
      });
    }
  }

  function flushTransform() {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    pendingTransform = null;
  }

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
      flushTransform();
      if (dragging) {
        targetEl.style.willChange = "";
      }
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
        targetEl.style.willChange = "transform";
        startX = touch.clientX;
        startY = touch.clientY;
      }
      return;
    }

    const closedPx = getClosedPx();
    const basePx = getBasePx();
    const clamped = Math.max(closedPx, Math.min(0, basePx + dx));
    scheduleTransform(`translateX(${clamped}px)`);
    event.preventDefault();
  }, { passive: false });

  bindEl.addEventListener("touchend", (event) => {
    if (startX === null) return;
    if (!shouldContinueMove(event)) {
      flushTransform();
      if (dragging) {
        targetEl.style.willChange = "";
      }
      startX = null;
      startY = null;
      dragging = false;
      return;
    }
    const touch = event.changedTouches[0];
    const dx = touch.clientX - startX;
    const wasDragging = dragging;

    flushTransform();
    startX = null;
    startY = null;
    dragging = false;

    if (wasDragging) {
      targetEl.style.transition = "";
      targetEl.style.transform = "";
      targetEl.style.willChange = "";
      if (onRelease) onRelease(dx, wasDragging);
    }
  });

  bindEl.addEventListener("touchcancel", () => {
    flushTransform();
    if (dragging) {
      targetEl.style.transition = "";
      targetEl.style.transform = "";
      targetEl.style.willChange = "";
    }
    startX = null;
    startY = null;
    dragging = false;
  });
}
