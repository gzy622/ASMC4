import { DRAG_START_THRESHOLD, DRAG_SLOPE } from "./constants.js";
import { animateMotionRelease, mapInteractiveDelta } from "./gesture-motion-engine.js";
import { beginTargetReleaseAnimation, endTargetReleaseAnimation } from "./motion-registry.js";
import { beginLayerDrag, clearLayerMotionDrag, isLayerMotionDragging } from "./layer-motion-state.js";
import { claimDirection, releaseDirection, setUiTransitionBusy } from "../runtime.js";
import { traceGesture } from "../utils/trace.js";
import {
  beginDragMotion,
  bindAndroidTouchmoveGuard,
  capturePointer,
  clearMotionDragStyles,
  createTransformBatcher,
  createVelocityTracker,
  isPrimaryPointerButton,
  releasePointer,
  restoreAfterDragAbort,
} from "./pointer-drag-lifecycle.js";

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
  useNonlinearMotion = false,
  busyKey = "drawer",
  traceLabel,
}) {
  let startX = null;
  let startY = null;
  let dragging = false;
  let activePointerId = null;
  let releaseAnimating = false;
  let releaseGeneration = 0;
  let activeRelease = null;
  let dragBasePx = 0;

  const { schedule: scheduleTransform, flush: flushTransform } = createTransformBatcher(targetEl);
  const motion = createVelocityTracker();

  function clearDragStyles() {
    clearMotionDragStyles(targetEl);
  }

  function resetDragState() {
    const wasDragging = dragging;
    restoreAfterDragAbort({
      wasDragging,
      flushTransform,
      clearDragStyles,
      releasePointer: () => releasePointer(bindEl, activePointerId),
    });
    releaseDirection(activePointerId);
    startX = null;
    startY = null;
    dragging = false;
    activePointerId = null;
    motion.clear();
    dragBasePx = 0;
    if (busyKey && wasDragging) setUiTransitionBusy(false, busyKey);
  }

  function abortRelease() {
    releaseGeneration += 1;
    activeRelease?.cancel();
    activeRelease = null;
    flushTransform();
    releasePointer(bindEl, activePointerId);
    releaseDirection(activePointerId);
    startX = null;
    startY = null;
    dragging = false;
    dragBasePx = 0;
    activePointerId = null;
    motion.clear();
    clearLayerMotionDrag(targetEl);
    if (busyKey) setUiTransitionBusy(false, busyKey);
    if (releaseAnimating) {
      releaseAnimating = false;
      endTargetReleaseAnimation(targetEl);
      clearDragStyles();
    }
  }

  bindEl.addEventListener("pointerdown", (event) => {
    if (releaseAnimating) return;
    if (activePointerId !== null) return;
    if (!isPrimaryPointerButton(event)) return;
    if (!shouldStart(event)) return;
    activePointerId = event.pointerId;
    releaseDirection(event.pointerId);
    startX = event.clientX;
    startY = event.clientY;
    dragging = false;
    dragBasePx = getBasePx();
    motion.reset(dragBasePx);
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
        beginLayerDrag(targetEl);
        if (traceLabel) traceGesture(traceLabel, "dragStart");
        capturePointer(bindEl, event);
        if (busyKey) setUiTransitionBusy(true, busyKey);
        beginDragMotion(targetEl);
        motion.reset(dragBasePx);
      } else {
        return;
      }
    }

    const closedPx = getClosedPx();
    const clamped = Math.max(closedPx, Math.min(0, dragBasePx + dx));
    const visualPx = useNonlinearMotion
      ? mapInteractiveDelta(clamped, closedPx, 0)
      : clamped;
    motion.track(clamped);
    scheduleTransform(`translateX(${visualPx}px)`);
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
    const releasedPx = motion.current;
    const releaseFromPx = useNonlinearMotion
      ? mapInteractiveDelta(releasedPx, getClosedPx(), 0)
      : releasedPx;
    const velocity = motion.velocity;
    const closedPx = getClosedPx();
    const basePx = getBasePx();
    const targetPx = getReleaseTargetPx({ dx, closedPx, basePx, currentPx: releasedPx, velocity });

    flushTransform();
    releasePointer(bindEl, activePointerId);
    releaseDirection(event.pointerId);
    startX = null;
    startY = null;
    dragging = false;
    activePointerId = null;

    if (!wasDragging) {
      if (isLayerMotionDragging(targetEl)) {
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
    targetEl.style.transform = `translateX(${releaseFromPx}px)`;
    const secondaryTarget = getReleaseSecondary
      ? getReleaseSecondary({ releasedPx, closedPx, toPx: targetPx })
      : null;
    try {
      activeRelease = animateMotionRelease(targetEl, "x", releaseFromPx, targetPx, velocity, secondaryTarget);
      await activeRelease.finished;
      if (generation !== releaseGeneration) return;
      releaseAnimating = false;
      endTargetReleaseAnimation(targetEl);
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
      if (busyKey && wasDragging) setUiTransitionBusy(false, busyKey);
      dragBasePx = 0;
      activeRelease = null;
    }
  });

  bindEl.addEventListener("pointercancel", (event) => {
    if (event.pointerId !== activePointerId) return;
    if (traceLabel) traceGesture(traceLabel, "pointercancel");
    resetDragState();
  });

  bindAndroidTouchmoveGuard(
    bindEl,
    () => activePointerId !== null && startX !== null,
    (event) => {
      const dx = Math.abs(event.touches[0].clientX - startX);
      const dy = Math.abs(event.touches[0].clientY - startY);
      return dx > DRAG_START_THRESHOLD && dx > dy * DRAG_SLOPE;
    },
  );

  return { abortRelease };
}
