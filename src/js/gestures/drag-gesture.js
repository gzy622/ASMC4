import { DRAG_START_THRESHOLD, VERTICAL_CLOSE_THRESHOLD } from "./constants.js";

export function createVerticalDragGesture(el, { closeDirection, onClose, threshold = VERTICAL_CLOSE_THRESHOLD, slope = 1.5 }) {
  let startY = null;
  let startX = null;
  let dragging = false;
  let currentDelta = 0;
  let pendingTransform = null;
  let rafId = null;

  function scheduleTransform(value) {
    pendingTransform = value;
    if (rafId === null) {
      rafId = requestAnimationFrame(() => {
        rafId = null;
        if (pendingTransform !== null) {
          el.style.transform = pendingTransform;
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

  function handleTouchStart(event) {
    const touch = event.touches[0];
    startY = touch.clientY;
    startX = touch.clientX;
  }

  function handleTouchMove(event) {
    if (startY === null) return;
    const touch = event.touches[0];
    const dy = touch.clientY - startY;
    const dx = touch.clientX - startX;

    if (Math.abs(dy) > 2 && Math.abs(dy) > Math.abs(dx)) {
      event.preventDefault();
    }

    if (!dragging) {
      if (Math.abs(dy) < DRAG_START_THRESHOLD) return;
      if (Math.abs(dy) < Math.abs(dx) * slope) return;
      dragging = true;
      el.style.transition = "none";
      el.style.willChange = "transform";
      startY = touch.clientY;
      startX = touch.clientX;
      return;
    }

    let clamped;
    if (closeDirection < 0) {
      clamped = Math.min(0, dy);
    } else {
      clamped = Math.max(0, dy);
    }

    currentDelta = clamped;
    scheduleTransform(`translateY(${clamped}px)`);
    event.preventDefault();
  }

  function handleTouchEnd() {
    if (startY === null) return;
    const wasDragging = dragging;
    const delta = currentDelta;

    flushTransform();
    startY = null;
    startX = null;
    dragging = false;
    currentDelta = 0;

    if (!wasDragging) return;

    el.style.transition = "";
    el.style.transform = "";
    el.style.willChange = "";

    if (Math.abs(delta) >= threshold) {
      onClose();
    }
  }

  function handleTouchCancel() {
    flushTransform();
    if (dragging) {
      el.style.transition = "";
      el.style.transform = "";
      el.style.willChange = "";
    }
    startY = null;
    startX = null;
    dragging = false;
    currentDelta = 0;
  }

  el.addEventListener("touchstart", handleTouchStart, { passive: true });
  el.addEventListener("touchmove", handleTouchMove, { passive: false });
  el.addEventListener("touchend", handleTouchEnd);
  el.addEventListener("touchcancel", handleTouchCancel);
}
