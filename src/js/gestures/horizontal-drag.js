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
  let activePointerId = null;
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

  function isPrimaryMouseButton(event) {
    return event.pointerType !== "mouse" || event.button === 0;
  }

  function capturePointer(event) {
    if (bindEl.setPointerCapture && !bindEl.hasPointerCapture(event.pointerId)) {
      bindEl.setPointerCapture(event.pointerId);
    }
  }

  function releasePointer() {
    if (
      activePointerId !== null
      && bindEl.releasePointerCapture
      && bindEl.hasPointerCapture(activePointerId)
    ) {
      bindEl.releasePointerCapture(activePointerId);
    }
  }

  function resetDragState({ restoreTarget = false } = {}) {
    flushTransform();
    if (restoreTarget && dragging) {
      targetEl.style.transition = "";
      targetEl.style.transform = "";
      targetEl.style.willChange = "";
    } else if (dragging) {
      targetEl.style.willChange = "";
    }
    releasePointer();
    startX = null;
    startY = null;
    dragging = false;
    activePointerId = null;
  }

  bindEl.addEventListener("pointerdown", (event) => {
    if (activePointerId !== null) return;
    if (!isPrimaryMouseButton(event)) return;
    if (!shouldStart(event)) return;
    activePointerId = event.pointerId;
    startX = event.clientX;
    startY = event.clientY;
    dragging = false;
  });

  bindEl.addEventListener("pointermove", (event) => {
    if (event.pointerId !== activePointerId) return;
    if (startX === null) return;
    if (!shouldContinueMove(event)) {
      resetDragState();
      return;
    }
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;

    if (onTrackMove) onTrackMove(dx, dy);

    if (Math.abs(dx) > 2 && Math.abs(dx) > Math.abs(dy)) {
      event.preventDefault();
    }

    if (!dragging) {
      if (Math.abs(dx) > DRAG_START_THRESHOLD && Math.abs(dx) > Math.abs(dy) * DRAG_SLOPE) {
        dragging = true;
        capturePointer(event);
        targetEl.style.transition = "none";
        targetEl.style.willChange = "transform";
        startX = event.clientX;
        startY = event.clientY;
      }
      return;
    }

    const closedPx = getClosedPx();
    const basePx = getBasePx();
    const clamped = Math.max(closedPx, Math.min(0, basePx + dx));
    scheduleTransform(`translateX(${clamped}px)`);
    event.preventDefault();
  }, { passive: false });

  bindEl.addEventListener("pointerup", (event) => {
    if (event.pointerId !== activePointerId) return;
    if (startX === null) return;
    if (!shouldContinueMove(event)) {
      resetDragState();
      return;
    }
    const dx = event.clientX - startX;
    const wasDragging = dragging;

    flushTransform();
    releasePointer();
    startX = null;
    startY = null;
    dragging = false;
    activePointerId = null;

    if (wasDragging) {
      targetEl.style.transition = "";
      targetEl.style.transform = "";
      targetEl.style.willChange = "";
      if (onRelease) onRelease(dx, wasDragging);
    }
  });

  bindEl.addEventListener("pointercancel", (event) => {
    if (event.pointerId !== activePointerId) return;
    resetDragState({ restoreTarget: true });
  });
}
