import { DRAG_START_THRESHOLD, DRAG_SLOPE } from "./constants.js";
import { animateRelease } from "./release-animation.js";
import { beginTargetReleaseAnimation, endTargetReleaseAnimation } from "./motion-registry.js";
import { claimDirection, releaseDirection } from "../runtime.js";
import { parseTransformAxis } from "../utils/transform.js";
import { traceGesture } from "../utils/trace.js";

const MOTION_DRAGGING_CLASS = "is-motion-dragging";

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
  busyKey = "drawer",
  traceLabel,
}) {
  let startX = null;
  let startY = null;
  let dragging = false;
  let activePointerId = null;
  let currentPx = 0;
  let lastMoveAt = 0;
  let lastVelocity = 0;
  let releaseAnimating = false;
  let releaseGeneration = 0;
  let activeRelease = null;
  let pendingTransform = null;
  let rafId = null;
  let dragBasePx = 0;

  function setMotionDragging(active) {
    targetEl.classList.toggle(MOTION_DRAGGING_CLASS, active);
  }

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
    if (pendingTransform !== null) {
      targetEl.style.transform = pendingTransform;
      pendingTransform = null;
    }
  }

  function clearDragStyles() {
    targetEl.style.transition = "none";
    targetEl.style.transform = "";
    targetEl.style.willChange = "";
    void targetEl.offsetWidth;
    targetEl.style.transition = "";
    setMotionDragging(false);
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
    const hadMotion = targetEl.classList.contains(MOTION_DRAGGING_CLASS);
    flushTransform();
    if ((restoreTarget && dragging) || hadMotion) {
      clearDragStyles();
    } else if (dragging) {
      targetEl.style.willChange = "";
    }
    releasePointer();
    releaseDirection(activePointerId);
    startX = null;
    startY = null;
    dragging = false;
    activePointerId = null;
    currentPx = 0;
    dragBasePx = 0;
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

  function readCurrentPx() {
    const transform = targetEl.style.transform || getComputedStyle(targetEl).transform;
    return parseTransformAxis(transform, "X");
  }

  bindEl.addEventListener("pointerdown", (event) => {
    if (releaseAnimating) return;
    if (activePointerId !== null) return;
    if (!isPrimaryMouseButton(event)) return;
    if (!shouldStart(event)) return;
    activePointerId = event.pointerId;
    releaseDirection(event.pointerId);
    startX = event.clientX;
    startY = event.clientY;
    dragging = false;
    dragBasePx = getBasePx();
    currentPx = dragBasePx;
    lastMoveAt = performance.now();
    lastVelocity = 0;
    if (traceLabel) traceGesture(traceLabel, "pointerdown");
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
        const lock = claimDirection(event.pointerId, "h");
        if (lock !== "h") {
          resetDragState();
          return;
        }
        dragging = true;
        setMotionDragging(true);
        if (traceLabel) traceGesture(traceLabel, "dragStart");
        capturePointer(event);
        targetEl.style.transition = "none";
        targetEl.style.willChange = "transform";
        currentPx = dragBasePx;
        lastVelocity = 0;
      } else {
        return;
      }
    }

    const closedPx = getClosedPx();
    const clamped = Math.max(closedPx, Math.min(0, dragBasePx + dx));
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
    releaseDirection(event.pointerId);
    startX = null;
    startY = null;
    dragging = false;
    activePointerId = null;

    if (!wasDragging) {
      // Interrupted release then lifted without re-dragging.
      if (targetEl.classList.contains(MOTION_DRAGGING_CLASS)) {
        clearDragStyles();
      }
      return;
    }

    if (traceLabel) {
      traceGesture(traceLabel, "release", {
        delta: releasedPx,
        velocity,
        targetPx
      });
    }
    const generation = ++releaseGeneration;
    releaseAnimating = true;
    beginTargetReleaseAnimation(targetEl, targetPx === 0 ? "open" : "close");
    targetEl.style.transform = `translateX(${releasedPx}px)`;
    const secondaryTarget = getReleaseSecondary
      ? getReleaseSecondary({ releasedPx, closedPx, toPx: targetPx })
      : null;
    try {
      activeRelease = animateRelease(targetEl, "x", releasedPx, targetPx, velocity, secondaryTarget);
      await activeRelease.finished;
      if (generation !== releaseGeneration) return;
      releaseAnimating = false;
      endTargetReleaseAnimation(targetEl);
      setMotionDragging(false);
      if (onRelease) onRelease(dx, wasDragging, velocity);
      if (traceLabel) traceGesture(traceLabel, "close");
    } finally {
      if (generation !== releaseGeneration) {
        activeRelease = null;
        return;
      }
      clearDragStyles();
      if (secondaryTarget) {
        secondaryTarget.el.style[secondaryTarget.prop] = "";
      }
      if (releaseAnimating) {
        releaseAnimating = false;
        endTargetReleaseAnimation(targetEl);
      }
      dragBasePx = 0;
      activeRelease = null;
    }
  });

  bindEl.addEventListener("pointercancel", (event) => {
    if (event.pointerId !== activePointerId) return;
    if (traceLabel) traceGesture(traceLabel, "pointercancel");
    resetDragState({ restoreTarget: true });
  });

  // Android WebView: prevent native scroll when horizontal gesture is detected
  bindEl.addEventListener("touchmove", (event) => {
    if (activePointerId === null || startX === null) return;
    const dx = Math.abs(event.touches[0].clientX - startX);
    const dy = Math.abs(event.touches[0].clientY - startY);
    if (dx > DRAG_START_THRESHOLD && dx > dy * DRAG_SLOPE) {
      event.preventDefault();
    }
  }, { passive: false });
}
