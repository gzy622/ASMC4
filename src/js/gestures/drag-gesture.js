import { DRAG_START_THRESHOLD, VERTICAL_CLOSE_THRESHOLD } from "./constants.js";
import { animateRelease } from "./release-animation.js";

export function createVerticalDragGesture(el, { closeDirection, onClose, threshold = VERTICAL_CLOSE_THRESHOLD, slope = 1.5 }) {
  let startY = null;
  let startX = null;
  let dragging = false;
  let currentDelta = 0;
  let activePointerId = null;
  let lastMoveAt = 0;
  let lastVelocity = 0;
  let releaseAnimating = false;
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

  function clearDragStyles() {
    el.style.transition = "none";
    el.style.transform = "";
    el.style.willChange = "";
    void el.offsetWidth;
    el.style.transition = "";
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
      clearDragStyles();
    }
    releasePointer();
    startY = null;
    startX = null;
    dragging = false;
    currentDelta = 0;
    activePointerId = null;
    lastMoveAt = 0;
    lastVelocity = 0;
  }

  function trackVelocity(nextDelta) {
    const now = performance.now();
    if (lastMoveAt > 0) {
      const elapsed = now - lastMoveAt;
      if (elapsed > 0) {
        lastVelocity = (nextDelta - currentDelta) / elapsed;
      }
    }
    currentDelta = nextDelta;
    lastMoveAt = now;
  }

  function handlePointerDown(event) {
    if (releaseAnimating) return;
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
      currentDelta = 0;
      lastMoveAt = performance.now();
      lastVelocity = 0;
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

    trackVelocity(clamped);
    scheduleTransform(`translateY(${clamped}px)`);
    event.preventDefault();
  }

  async function handlePointerUp(event) {
    if (event.pointerId !== activePointerId) return;
    if (startY === null) return;
    const wasDragging = dragging;
    const delta = currentDelta;
    const velocity = lastVelocity;
    const shouldClose = Math.abs(delta) >= threshold;
    const targetDelta = shouldClose ? closeDirection * el.offsetHeight : 0;

    flushTransform();
    releasePointer();
    startY = null;
    startX = null;
    dragging = false;
    currentDelta = 0;
    activePointerId = null;

    if (!wasDragging) return;

    releaseAnimating = true;
    el.style.transform = `translateY(${delta}px)`;
    try {
      await animateRelease(el, "y", delta, targetDelta, velocity);
      if (shouldClose) {
        onClose();
      }
    } finally {
      clearDragStyles();
      releaseAnimating = false;
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
