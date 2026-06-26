import { DRAG_START_THRESHOLD, VERTICAL_CLOSE_THRESHOLD } from "./constants.js";

export function createVerticalDragGesture(el, { closeDirection, onClose, threshold = VERTICAL_CLOSE_THRESHOLD, slope = 1.5 }) {
  let startY = null;
  let startX = null;
  let dragging = false;
  let currentDelta = 0;
  let activePointerId = null;
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

  function isPrimaryMouseButton(event) {
    return event.pointerType !== "mouse" || event.button === 0;
  }

  function capturePointer(event) {
    if (el.setPointerCapture && !el.hasPointerCapture(event.pointerId)) {
      el.setPointerCapture(event.pointerId);
    }
  }

  function releasePointer() {
    if (
      activePointerId !== null
      && el.releasePointerCapture
      && el.hasPointerCapture(activePointerId)
    ) {
      el.releasePointerCapture(activePointerId);
    }
  }

  function resetDragState({ restoreTarget = false } = {}) {
    flushTransform();
    if (restoreTarget && dragging) {
      el.style.transition = "";
      el.style.transform = "";
      el.style.willChange = "";
    }
    releasePointer();
    startY = null;
    startX = null;
    dragging = false;
    currentDelta = 0;
    activePointerId = null;
  }

  function handlePointerDown(event) {
    if (activePointerId !== null) return;
    if (!isPrimaryMouseButton(event)) return;
    activePointerId = event.pointerId;
    startY = event.clientY;
    startX = event.clientX;
  }

  function handlePointerMove(event) {
    if (event.pointerId !== activePointerId) return;
    if (startY === null) return;
    const dy = event.clientY - startY;
    const dx = event.clientX - startX;

    if (Math.abs(dy) > 2 && Math.abs(dy) > Math.abs(dx)) {
      event.preventDefault();
    }

    if (!dragging) {
      if (Math.abs(dy) < DRAG_START_THRESHOLD) return;
      if (Math.abs(dy) < Math.abs(dx) * slope) return;
      dragging = true;
      capturePointer(event);
      el.style.transition = "none";
      el.style.willChange = "transform";
      startY = event.clientY;
      startX = event.clientX;
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

  function handlePointerUp(event) {
    if (event.pointerId !== activePointerId) return;
    if (startY === null) return;
    const wasDragging = dragging;
    const delta = currentDelta;

    flushTransform();
    releasePointer();
    startY = null;
    startX = null;
    dragging = false;
    currentDelta = 0;
    activePointerId = null;

    if (!wasDragging) return;

    el.style.transition = "";
    el.style.transform = "";
    el.style.willChange = "";

    if (Math.abs(delta) >= threshold) {
      onClose();
    }
  }

  function handlePointerCancel(event) {
    if (event.pointerId !== activePointerId) return;
    resetDragState({ restoreTarget: true });
  }

  el.addEventListener("pointerdown", handlePointerDown);
  el.addEventListener("pointermove", handlePointerMove, { passive: false });
  el.addEventListener("pointerup", handlePointerUp);
  el.addEventListener("pointercancel", handlePointerCancel);
}
