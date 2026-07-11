import {
  DRAG_START_THRESHOLD,
  DRAG_SLOPE,
  VERTICAL_CLOSE_THRESHOLD
} from "./constants.js";
import { evaluateSwipeRelease } from "./swipe-release.js";
import { animateMotionRelease, mapInteractiveDelta } from "./gesture-motion-engine.js";
import { beginTargetReleaseAnimation, endTargetReleaseAnimation } from "./motion-registry.js";
import { beginLayerDrag, clearLayerMotionDrag, isLayerMotionDragging } from "./layer-motion-state.js";
import { claimDirection, releaseDirection, setUiTransitionBusy } from "../runtime.js";
import { traceGesture } from "../utils/trace.js";
import {
  beginDragMotion,
  bindPointerDragLifecycle,
  capturePointer,
  clearMotionDragStyles,
  createTransformBatcher,
  createVelocityTracker,
  isPrimaryPointerButton,
  releasePointer,
  restoreAfterDragAbort,
} from "./pointer-drag-lifecycle.js";

export function createVerticalDragGesture(el, {
  closeDirection,
  onClose,
  threshold = VERTICAL_CLOSE_THRESHOLD,
  slope = DRAG_SLOPE,
  targetEl = el,
  shouldStart = () => true,
  onDragStart,
  onProgress,
  getReleaseSecondary,
  getCloseTargetPx,
  busyKey = "gesture",
  useNonlinearMotion = false,
  formatTransform = (delta) => `translateY(${delta}px)`,
  durationScale = 1,
  traceLabel,
}) {
  let startY = null;
  let startX = null;
  let dragging = false;
  let activePointerId = null;
  let releaseAnimating = false;
  let releaseGeneration = 0;
  let activeRelease = null;
  let dragBaseDelta = 0;

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
      releasePointer: () => releasePointer(el, activePointerId),
    });
    releaseDirection(activePointerId);
    startY = null;
    startX = null;
    dragging = false;
    motion.clear();
    activePointerId = null;
    if (busyKey && wasDragging) setUiTransitionBusy(false, busyKey);
  }

  function abortRelease() {
    releaseGeneration += 1;
    activeRelease?.cancel();
    activeRelease = null;
    flushTransform();
    releasePointer(el, activePointerId);
    releaseDirection(activePointerId);
    startY = null;
    startX = null;
    dragging = false;
    dragBaseDelta = 0;
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

  function handlePointerDown(event) {
    if (releaseAnimating) return;
    if (activePointerId !== null) return;
    if (!isPrimaryPointerButton(event)) return;
    if (!shouldStart(event)) return;
    activePointerId = event.pointerId;
    releaseDirection(event.pointerId);
    startY = event.clientY;
    startX = event.clientX;
    dragBaseDelta = 0;
    motion.reset(dragBaseDelta);
    if (traceLabel) traceGesture(traceLabel, "pointerdown");
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
      if (Math.abs(dx) > DRAG_START_THRESHOLD && Math.abs(dx) > Math.abs(dy) * slope) {
        resetDragState();
        return;
      }
      if (Math.abs(dy) < Math.abs(dx) * slope) return;
      const lock = claimDirection(event.pointerId, "v");
      if (lock !== "v") {
        resetDragState();
        return;
      }
      dragging = true;
      beginLayerDrag(targetEl);
      if (traceLabel) traceGesture(traceLabel, "dragStart");
      if (onDragStart) onDragStart(event);
      if (busyKey) setUiTransitionBusy(true, busyKey);
      capturePointer(el, event);
      beginDragMotion(targetEl);
      motion.reset(dragBaseDelta);
    }

    let clamped;
    if (closeDirection < 0) {
      clamped = Math.min(0, dragBaseDelta + dy);
    } else {
      clamped = Math.max(0, dragBaseDelta + dy);
    }

    const closeTargetPx = getCloseTargetPx
      ? getCloseTargetPx(targetEl)
      : targetEl.offsetHeight;
    const visualDelta = useNonlinearMotion
      ? mapInteractiveDelta(
        clamped,
        closeDirection < 0 ? -closeTargetPx : 0,
        closeDirection < 0 ? 0 : closeTargetPx
      )
      : clamped;
    motion.track(clamped);
    scheduleTransform(formatTransform(visualDelta));
    if (onProgress) {
      const range = targetEl.offsetHeight;
      onProgress(range > 0 ? 1 - Math.abs(clamped) / range : 0);
    }
    event.preventDefault();
  }

  async function handlePointerUp(event) {
    if (event.pointerId !== activePointerId) return;
    if (startY === null) return;
    const wasDragging = dragging;
    const delta = motion.current;
    const velocity = motion.velocity;
    const shouldClose = evaluateSwipeRelease({
      distance: Math.abs(delta),
      velocity,
      direction: closeDirection,
      distanceThreshold: threshold,
    });
    const closeTargetPx = getCloseTargetPx
      ? getCloseTargetPx(targetEl)
      : targetEl.offsetHeight;
    const targetDelta = shouldClose ? closeDirection * closeTargetPx : 0;
    const releaseFromDelta = useNonlinearMotion
      ? mapInteractiveDelta(
        delta,
        closeDirection < 0 ? -closeTargetPx : 0,
        closeDirection < 0 ? 0 : closeTargetPx
      )
      : delta;

    flushTransform();
    releasePointer(el, activePointerId);
    releaseDirection(event.pointerId);
    startY = null;
    startX = null;
    dragging = false;
    activePointerId = null;

    if (!wasDragging) {
      if (isLayerMotionDragging(targetEl)) {
        clearDragStyles();
      }
      return;
    }

    if (traceLabel) {
      traceGesture(traceLabel, "release", { delta, velocity, willClose: shouldClose });
    }

    const generation = releaseGeneration;
    releaseAnimating = true;
    beginTargetReleaseAnimation(targetEl, shouldClose ? "close" : "open");
    targetEl.style.transform = formatTransform(releaseFromDelta);
    const secondaryTarget = getReleaseSecondary
      ? getReleaseSecondary({ delta, targetDelta })
      : null;
    try {
      activeRelease = animateMotionRelease(
        targetEl,
        "y",
        releaseFromDelta,
        targetDelta,
        velocity,
        secondaryTarget,
        formatTransform,
        durationScale,
      );
      await activeRelease.finished;
      if (generation !== releaseGeneration) return;
      releaseAnimating = false;
      if (shouldClose) {
        if (traceLabel) traceGesture(traceLabel, "close");
        onClose();
      } else {
        endTargetReleaseAnimation(targetEl);
        if (traceLabel) traceGesture(traceLabel, "cancel");
      }
    } finally {
      if (generation !== releaseGeneration) {
        activeRelease = null;
        return;
      }
      if (wasDragging && shouldClose && onClose) {
        endTargetReleaseAnimation(targetEl);
        targetEl.style.willChange = "";
        clearLayerMotionDrag(targetEl);
      } else if (wasDragging) {
        clearDragStyles();
      }
      if (secondaryTarget) {
        secondaryTarget.el.style[secondaryTarget.prop] = "";
      }
      if (releaseAnimating) {
        releaseAnimating = false;
        endTargetReleaseAnimation(targetEl);
      }
      if (busyKey && wasDragging) setUiTransitionBusy(false, busyKey);
      dragBaseDelta = 0;
      activeRelease = null;
    }
  }

  function handlePointerCancel(event) {
    if (event.pointerId !== activePointerId) return;
    if (traceLabel) traceGesture(traceLabel, "pointercancel");
    resetDragState();
  }

  bindPointerDragLifecycle(el, {
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: handlePointerUp,
    onPointerCancel: handlePointerCancel,
    androidTouchmove: {
      getActive: () => activePointerId !== null && startY !== null,
      shouldPreventDefault: (event) => Math.abs(event.touches[0].clientY - startY) > DRAG_START_THRESHOLD,
    },
  });

  return { abortRelease };
}
