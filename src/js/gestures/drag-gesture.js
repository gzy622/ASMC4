import {
  DRAG_START_THRESHOLD,
  DRAG_SLOPE,
  FLING_VELOCITY_THRESHOLD,
  MIN_FLING_DISTANCE,
  VERTICAL_CLOSE_THRESHOLD
} from "./constants.js";
import { animateRelease } from "./release-animation.js";
import { beginTargetReleaseAnimation, endTargetReleaseAnimation } from "./motion-registry.js";
import { beginLayerDrag, clearLayerMotionDrag, isLayerMotionDragging } from "./layer-motion-state.js";
import { claimDirection, releaseDirection } from "../runtime.js";
import { traceGesture } from "../utils/trace.js";
import {
  beginDragMotion,
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
  formatTransform = (delta) => `translateY(${delta}px)`,
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
    restoreAfterDragAbort({
      wasDragging: dragging,
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

    motion.track(clamped);
    scheduleTransform(formatTransform(clamped));
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
    const flingingOpen = velocity * closeDirection <= -FLING_VELOCITY_THRESHOLD;
    const shouldClose = !flingingOpen && (
      Math.abs(delta) >= threshold
      || (Math.abs(delta) >= MIN_FLING_DISTANCE && velocity * closeDirection >= FLING_VELOCITY_THRESHOLD)
    );
    const closeTargetPx = getCloseTargetPx
      ? getCloseTargetPx(targetEl)
      : targetEl.offsetHeight;
    const targetDelta = shouldClose ? closeDirection * closeTargetPx : 0;

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
    targetEl.style.transform = formatTransform(delta);
    const secondaryTarget = getReleaseSecondary
      ? getReleaseSecondary({ delta, targetDelta })
      : null;
    try {
      activeRelease = animateRelease(targetEl, "y", delta, targetDelta, velocity, secondaryTarget, formatTransform);
      await activeRelease.finished;
      if (generation !== releaseGeneration) return;
      releaseAnimating = false;
      endTargetReleaseAnimation(targetEl);
      if (shouldClose) {
        if (traceLabel) traceGesture(traceLabel, "close");
        onClose();
      } else if (traceLabel) {
        traceGesture(traceLabel, "cancel");
      }
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
      dragBaseDelta = 0;
      activeRelease = null;
    }
  }

  function handlePointerCancel(event) {
    if (event.pointerId !== activePointerId) return;
    if (traceLabel) traceGesture(traceLabel, "pointercancel");
    resetDragState();
  }

  el.addEventListener("pointerdown", handlePointerDown);
  el.addEventListener("pointermove", handlePointerMove, { passive: false });
  el.addEventListener("pointerup", handlePointerUp);
  el.addEventListener("pointercancel", handlePointerCancel);

  // Android WebView: prevent native scroll when vertical gesture is detected
  el.addEventListener("touchmove", (event) => {
    if (activePointerId === null || startY === null) return;
    if (Math.abs(event.touches[0].clientY - startY) > DRAG_START_THRESHOLD) {
      event.preventDefault();
    }
  }, { passive: false });

  return { abortRelease };
}

export function createTopSheetOpenGesture(bindEl, {
  sheetEl,
  canStart = () => true,
  canPull = () => true,
  onPrepare,
  onOpen,
  onCancel,
  threshold = VERTICAL_CLOSE_THRESHOLD,
  slope = DRAG_SLOPE,
  onProgress,
  getReleaseSecondary,
  keepSecondaryOnOpen = false,
  busyKey = "panel",
  traceLabel,
}) {
  let releaseGeneration = 0;
  let activeRelease = null;
  let startY = null;
  let startX = null;
  let dragging = false;
  let activePointerId = null;
  let releaseAnimating = false;
  let dragBaseDelta = 0;

  const { schedule: scheduleTransform, flush: flushTransform } = createTransformBatcher(sheetEl);
  const motion = createVelocityTracker();

  function closedDelta() {
    return -sheetEl.offsetHeight;
  }

  function clearDragStyles() {
    clearMotionDragStyles(sheetEl);
  }

  function resetDragState({ notifyCancel = false } = {}) {
    const wasDragging = dragging;
    restoreAfterDragAbort({
      wasDragging,
      flushTransform,
      clearDragStyles,
      releasePointer: () => releasePointer(bindEl, activePointerId),
    });
    releaseDirection(activePointerId);
    startY = null;
    startX = null;
    dragging = false;
    activePointerId = null;
    motion.clear();
    if (wasDragging && notifyCancel && onCancel) onCancel();
  }

  function handlePointerDown(event) {
    if (releaseAnimating) return;
    if (activePointerId !== null) return;
    if (!isPrimaryPointerButton(event)) return;
    if (!canStart(event)) return;
    if (!canPull(event)) return;
    activePointerId = event.pointerId;
    releaseDirection(event.pointerId);
    startY = event.clientY;
    startX = event.clientX;
    dragging = false;
    dragBaseDelta = closedDelta();
    motion.reset(dragBaseDelta);
    if (traceLabel) traceGesture(traceLabel, "pointerdown");
  }

  function handlePointerMove(event) {
    if (event.pointerId !== activePointerId) return;
    if (startY === null) return;

    const dy = event.clientY - startY;
    const dx = event.clientX - startX;

    if (!dragging) {
      if (dy <= 0) {
        resetDragState();
        return;
      }
      if (Math.abs(dx) > DRAG_START_THRESHOLD && Math.abs(dx) > Math.abs(dy) * slope) {
        resetDragState();
        return;
      }
      if (Math.abs(dy) < DRAG_START_THRESHOLD) return;
      if (Math.abs(dy) < Math.abs(dx) * slope) {
        resetDragState();
        return;
      }
      if (!canPull(event)) {
        resetDragState();
        return;
      }

      const lock = claimDirection(event.pointerId, "v");
      if (lock !== "v") {
        resetDragState();
        return;
      }

      dragging = true;
      beginLayerDrag(sheetEl);
      if (traceLabel) traceGesture(traceLabel, "dragStart");
      capturePointer(bindEl, event);
      if (onPrepare) onPrepare();
      beginDragMotion(sheetEl);
      motion.reset(dragBaseDelta);
      event.preventDefault();
    }

    const minDelta = closedDelta();
    const clamped = Math.min(0, Math.max(minDelta, dragBaseDelta + dy));
    motion.track(clamped);
    scheduleTransform(`translateY(${clamped}px)`);
    if (onProgress) {
      const range = sheetEl.offsetHeight;
      onProgress(range > 0 ? (clamped - minDelta) / range : 0);
    }
    event.preventDefault();
  }

  async function handlePointerUp(event) {
    if (event.pointerId !== activePointerId) return;
    if (startY === null) return;

    const wasDragging = dragging;
    const delta = motion.current;
    const velocity = motion.velocity;
    const minDelta = closedDelta();
    const openedDistance = delta - minDelta;
    const flingingClose = velocity <= -FLING_VELOCITY_THRESHOLD;
    const shouldOpen = !flingingClose && (
      openedDistance >= threshold
      || (openedDistance >= MIN_FLING_DISTANCE && velocity >= FLING_VELOCITY_THRESHOLD)
    );
    const targetDelta = shouldOpen ? 0 : minDelta;

    flushTransform();
    releasePointer(bindEl, activePointerId);
    releaseDirection(event.pointerId);
    startY = null;
    startX = null;
    dragging = false;
    activePointerId = null;

    if (!wasDragging) {
      if (isLayerMotionDragging(sheetEl)) {
        clearDragStyles();
        if (onCancel) onCancel();
      }
      return;
    }

    if (traceLabel) {
      traceGesture(traceLabel, "release", { delta, velocity, willOpen: shouldOpen });
    }

    const generation = ++releaseGeneration;
    releaseAnimating = true;
    beginTargetReleaseAnimation(sheetEl, shouldOpen ? "open" : "close");
    sheetEl.style.transform = `translateY(${delta}px)`;
    const secondaryTarget = getReleaseSecondary
      ? getReleaseSecondary({ delta, minDelta, targetDelta })
      : null;

    if (shouldOpen && onOpen) {
      onOpen();
    }

    try {
      activeRelease = animateRelease(sheetEl, "y", delta, targetDelta, velocity, secondaryTarget);
      await activeRelease.finished;
      if (generation !== releaseGeneration) return;
      if (!shouldOpen) {
        if (traceLabel) traceGesture(traceLabel, "cancel");
        if (onCancel) onCancel();
      }
    } finally {
      if (generation !== releaseGeneration) return;
      clearDragStyles();
      if (secondaryTarget && !(shouldOpen && keepSecondaryOnOpen)) {
        secondaryTarget.el.style[secondaryTarget.prop] = "";
      }
      releaseAnimating = false;
      endTargetReleaseAnimation(sheetEl);
      dragBaseDelta = 0;
      activeRelease = null;
    }
  }

  function abortRelease() {
    releaseGeneration += 1;
    activeRelease?.cancel();
    activeRelease = null;
    releaseAnimating = false;
    endTargetReleaseAnimation(sheetEl);
    dragBaseDelta = 0;
    clearDragStyles();
  }

  function handlePointerCancel(event) {
    if (event.pointerId !== activePointerId) return;
    if (traceLabel) traceGesture(traceLabel, "pointercancel");
    if (dragging || isLayerMotionDragging(sheetEl)) {
      handlePointerUp(event);
      return;
    }
    resetDragState();
  }

  bindEl.addEventListener("pointerdown", handlePointerDown);
  bindEl.addEventListener("pointermove", handlePointerMove, { passive: false });
  bindEl.addEventListener("pointerup", handlePointerUp);
  bindEl.addEventListener("pointercancel", handlePointerCancel);

  // Android WebView: prevent native scroll when pull-down gesture is detected
  bindEl.addEventListener("touchmove", (event) => {
    if (activePointerId === null || startY === null) return;
    const dy = event.touches[0].clientY - startY;
    if (dragging || (dy > DRAG_START_THRESHOLD && canPull(event))) {
      event.preventDefault();
    }
  }, { passive: false });

  return { abortRelease };
}
