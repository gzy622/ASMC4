import { DRAG_START_THRESHOLD, DRAG_SLOPE } from "./constants.js";
import { animateRelease } from "./release-animation.js";
import { setOverlayTransitionBusy } from "../runtime.js";

export function createHorizontalDragGesture(bindEl, {
  targetEl,
  getClosedPx,
  getBasePx = () => 0,
  shouldStart = () => true,
  onTrackMove,
  shouldContinueMove = () => true,
  getReleaseTargetPx = ({ basePx }) => basePx,
  onProgress,
  getReleaseSecondary,
  onRelease,
}) {
  let startX = null;
  let startY = null;
  let dragging = false;
  let activePointerId = null;
  let currentPx = 0;
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

  function clearDragStyles() {
    targetEl.style.transition = "none";
    targetEl.style.transform = "";
    targetEl.style.willChange = "";
    void targetEl.offsetWidth;
    targetEl.style.transition = "";
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
      clearDragStyles();
    } else if (dragging) {
      targetEl.style.willChange = "";
    }
    releasePointer();
    startX = null;
    startY = null;
    dragging = false;
    activePointerId = null;
    currentPx = 0;
    lastMoveAt = 0;
    lastVelocity = 0;
  }

  function trackVelocity(nextPx) {
    const now = performance.now();
    if (lastMoveAt > 0) {
      const elapsed = now - lastMoveAt;
      if (elapsed > 0) {
        lastVelocity = (nextPx - currentPx) / elapsed;
      }
    }
    currentPx = nextPx;
    lastMoveAt = now;
  }

  bindEl.addEventListener("pointerdown", (event) => {
    if (releaseAnimating) return;
    if (activePointerId !== null) return;
    if (!isPrimaryMouseButton(event)) return;
    if (!shouldStart(event)) return;
    activePointerId = event.pointerId;
    startX = event.clientX;
    startY = event.clientY;
    dragging = false;
    currentPx = getBasePx();
    lastMoveAt = performance.now();
    lastVelocity = 0;
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
        currentPx = getBasePx();
        lastVelocity = 0;
      } else {
        return;
      }
    }

    const closedPx = getClosedPx();
    const basePx = getBasePx();
    const clamped = Math.max(closedPx, Math.min(0, basePx + dx));
    trackVelocity(clamped);
    scheduleTransform(`translateX(${clamped}px)`);
    if (onProgress) {
      const range = -closedPx;
      onProgress(range > 0 ? (clamped - closedPx) / range : 0);
    }
    event.preventDefault();
  }, { passive: false });

  bindEl.addEventListener("pointerup", async (event) => {
    if (event.pointerId !== activePointerId) return;
    if (startX === null) return;
    if (!shouldContinueMove(event)) {
      resetDragState();
      return;
    }
    const dx = event.clientX - startX;
    const wasDragging = dragging;
    const releasedPx = currentPx;
    const velocity = lastVelocity;
    const closedPx = getClosedPx();
    const basePx = getBasePx();
    const targetPx = getReleaseTargetPx({ dx, closedPx, basePx, currentPx: releasedPx, velocity });

    flushTransform();
    releasePointer();
    startX = null;
    startY = null;
    dragging = false;
    activePointerId = null;

    if (wasDragging) {
      releaseAnimating = true;
      setOverlayTransitionBusy(true);
      targetEl.style.transform = `translateX(${releasedPx}px)`;
      const secondaryTarget = getReleaseSecondary
        ? getReleaseSecondary({ releasedPx, closedPx, toPx: targetPx })
        : null;
      try {
        await animateRelease(targetEl, "x", releasedPx, targetPx, velocity, secondaryTarget);
        setOverlayTransitionBusy(false);
        if (onRelease) onRelease(dx, wasDragging, velocity);
      } finally {
        clearDragStyles();
        if (secondaryTarget) {
          secondaryTarget.el.style[secondaryTarget.prop] = "";
        }
        setOverlayTransitionBusy(false);
        releaseAnimating = false;
      }
    }
  });

  bindEl.addEventListener("pointercancel", (event) => {
    if (event.pointerId !== activePointerId) return;
    resetDragState({ restoreTarget: true });
  });
}
