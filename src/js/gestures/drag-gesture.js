import {
  DRAG_START_THRESHOLD,
  DRAG_SLOPE,
  FLING_VELOCITY_THRESHOLD,
  MIN_FLING_DISTANCE,
  VERTICAL_CLOSE_THRESHOLD
} from "./constants.js";
import { animateRelease } from "./release-animation.js";
import { claimDirection, releaseDirection, setUiTransitionBusy } from "../runtime.js";
import { parseTransformAxis } from "../utils/transform.js";

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
}) {
  let startY = null;
  let startX = null;
  let dragging = false;
  let currentDelta = 0;
  let activePointerId = null;
  let lastMoveAt = 0;
  let lastVelocity = 0;
  let releaseAnimating = false;
  let releaseGeneration = 0;
  let activeRelease = null;
  let pendingTransform = null;
  let rafId = null;
  let dragBaseDelta = 0;

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
    releaseDirection(activePointerId);
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

  function readCurrentDelta() {
    const transform = targetEl.style.transform || getComputedStyle(targetEl).transform;
    return parseTransformAxis(transform, "Y");
  }

  function abortRelease() {
    releaseGeneration += 1;
    activeRelease?.cancel();
    activeRelease = null;
    flushTransform();
    releasePointer();
    releaseDirection(activePointerId);
    startY = null;
    startX = null;
    dragging = false;
    currentDelta = 0;
    dragBaseDelta = 0;
    activePointerId = null;
    lastMoveAt = 0;
    lastVelocity = 0;
    if (releaseAnimating) {
      releaseAnimating = false;
      setUiTransitionBusy(false, busyKey);
      clearDragStyles();
    }
  }

  function interruptRelease() {
    if (!releaseAnimating) return;
    releaseGeneration += 1;
    activeRelease?.cancel();
    activeRelease = null;
    flushTransform();
    dragBaseDelta = readCurrentDelta();
    currentDelta = dragBaseDelta;
    releaseAnimating = false;
    setUiTransitionBusy(false, busyKey);
    targetEl.style.transition = "none";
    targetEl.style.willChange = "transform";
    targetEl.style.transform = `translateY(${dragBaseDelta}px)`;
  }

  function handlePointerDown(event) {
    const interrupted = releaseAnimating;
    if (releaseAnimating) {
      if (!shouldStart(event)) return;
      interruptRelease();
    }
    if (activePointerId !== null) return;
    if (!isPrimaryMouseButton(event)) return;
    if (!shouldStart(event)) return;
    activePointerId = event.pointerId;
    releaseDirection(event.pointerId);
    startY = event.clientY;
    startX = event.clientX;
    if (!interrupted) {
      dragBaseDelta = 0;
    }
    currentDelta = dragBaseDelta;
    lastMoveAt = performance.now();
    lastVelocity = 0;
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
      if (onDragStart) onDragStart(event);
      capturePointer(event);
      targetEl.style.transition = "none";
      targetEl.style.willChange = "transform";
      currentDelta = dragBaseDelta;
      lastVelocity = 0;
    }

    let clamped;
    if (closeDirection < 0) {
      clamped = Math.min(0, dragBaseDelta + dy);
    } else {
      clamped = Math.max(0, dragBaseDelta + dy);
    }

    trackVelocity(clamped);
    scheduleTransform(`translateY(${clamped}px)`);
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
    const delta = currentDelta;
    const velocity = lastVelocity;
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
    releasePointer();
    releaseDirection(event.pointerId);
    startY = null;
    startX = null;
    dragging = false;
    currentDelta = 0;
    activePointerId = null;

    if (!wasDragging) return;

    const generation = releaseGeneration;
    releaseAnimating = true;
    setUiTransitionBusy(true, busyKey);
    targetEl.style.transform = `translateY(${delta}px)`;
    const secondaryTarget = getReleaseSecondary
      ? getReleaseSecondary({ delta, targetDelta })
      : null;
    try {
      activeRelease = animateRelease(targetEl, "y", delta, targetDelta, velocity, secondaryTarget);
      await activeRelease.finished;
      if (generation !== releaseGeneration) return;
      setUiTransitionBusy(false, busyKey);
      if (shouldClose) {
        onClose();
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
      setUiTransitionBusy(false, busyKey);
      releaseAnimating = false;
      dragBaseDelta = 0;
      activeRelease = null;
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
}) {
  let releaseGeneration = 0;
  let activeRelease = null;
  let startY = null;
  let startX = null;
  let dragging = false;
  let activePointerId = null;
  let currentDelta = 0;
  let lastMoveAt = 0;
  let lastVelocity = 0;
  let releaseAnimating = false;
  let pendingTransform = null;
  let rafId = null;
  let dragBaseDelta = 0;

  function closedDelta() {
    return -sheetEl.offsetHeight;
  }

  function scheduleTransform(value) {
    pendingTransform = value;
    if (rafId === null) {
      rafId = requestAnimationFrame(() => {
        rafId = null;
        if (pendingTransform !== null) {
          sheetEl.style.transform = pendingTransform;
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
    sheetEl.style.transition = "none";
    sheetEl.style.transform = "";
    sheetEl.style.willChange = "";
    void sheetEl.offsetWidth;
    sheetEl.style.transition = "";
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

  function resetDragState({ restoreTarget = false, notifyCancel = false } = {}) {
    const wasDragging = dragging;
    flushTransform();
    if (restoreTarget && wasDragging) {
      clearDragStyles();
    } else if (wasDragging) {
      sheetEl.style.willChange = "";
    }
    releasePointer();
    releaseDirection(activePointerId);
    startY = null;
    startX = null;
    dragging = false;
    activePointerId = null;
    currentDelta = 0;
    lastMoveAt = 0;
    lastVelocity = 0;
    if (wasDragging && notifyCancel && onCancel) onCancel();
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

  function readCurrentDelta() {
    const transform = sheetEl.style.transform || getComputedStyle(sheetEl).transform;
    return parseTransformAxis(transform, "Y");
  }

  function interruptRelease() {
    if (!releaseAnimating) return;
    releaseGeneration += 1;
    activeRelease?.cancel();
    activeRelease = null;
    flushTransform();
    dragBaseDelta = readCurrentDelta();
    currentDelta = dragBaseDelta;
    releaseAnimating = false;
    setUiTransitionBusy(false, busyKey);
    sheetEl.style.transition = "none";
    sheetEl.style.willChange = "transform";
    sheetEl.style.transform = `translateY(${dragBaseDelta}px)`;
  }

  function handlePointerDown(event) {
    const interrupted = releaseAnimating;
    if (releaseAnimating) {
      if (!canStart(event) || !canPull(event)) return;
      interruptRelease();
    }
    if (activePointerId !== null) return;
    if (!isPrimaryMouseButton(event)) return;
    if (!canStart(event)) return;
    if (!canPull(event)) return;
    activePointerId = event.pointerId;
    releaseDirection(event.pointerId);
    startY = event.clientY;
    startX = event.clientX;
    dragging = false;
    if (!interrupted) {
      dragBaseDelta = closedDelta();
    }
    currentDelta = dragBaseDelta;
    lastMoveAt = performance.now();
    lastVelocity = 0;
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
      capturePointer(event);
      if (onPrepare) onPrepare();
      sheetEl.style.transition = "none";
      sheetEl.style.willChange = "transform";
      currentDelta = dragBaseDelta;
      lastVelocity = 0;
      event.preventDefault();
    }

    const minDelta = closedDelta();
    const clamped = Math.min(0, Math.max(minDelta, dragBaseDelta + dy));
    trackVelocity(clamped);
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
    const delta = currentDelta;
    const velocity = lastVelocity;
    const minDelta = closedDelta();
    const openedDistance = delta - minDelta;
    const flingingClose = velocity <= -FLING_VELOCITY_THRESHOLD;
    const shouldOpen = !flingingClose && (
      openedDistance >= threshold
      || (openedDistance >= MIN_FLING_DISTANCE && velocity >= FLING_VELOCITY_THRESHOLD)
    );
    const targetDelta = shouldOpen ? 0 : minDelta;

    flushTransform();
    releasePointer();
    releaseDirection(event.pointerId);
    startY = null;
    startX = null;
    dragging = false;
    activePointerId = null;
    currentDelta = 0;
    lastMoveAt = 0;
    lastVelocity = 0;

    if (!wasDragging) return;

    const generation = ++releaseGeneration;
    releaseAnimating = true;
    setUiTransitionBusy(true, busyKey);
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
      if (!shouldOpen && onCancel) {
        onCancel();
      }
    } finally {
      if (generation !== releaseGeneration) return;
      clearDragStyles();
      if (secondaryTarget && !(shouldOpen && keepSecondaryOnOpen)) {
        secondaryTarget.el.style[secondaryTarget.prop] = "";
      }
      setUiTransitionBusy(false, busyKey);
      releaseAnimating = false;
      dragBaseDelta = 0;
      activeRelease = null;
    }
  }

  function abortRelease() {
    releaseGeneration += 1;
    activeRelease?.cancel();
    activeRelease = null;
    releaseAnimating = false;
    dragBaseDelta = 0;
    setUiTransitionBusy(false, busyKey);
    clearDragStyles();
  }

  function handlePointerCancel(event) {
    if (event.pointerId !== activePointerId) return;
    if (dragging) {
      handlePointerUp(event);
      return;
    }
    resetDragState({ restoreTarget: true });
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
