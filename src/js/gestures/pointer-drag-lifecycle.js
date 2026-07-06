import { clearLayerMotionDrag } from "./layer-motion-state.js";

export function isPrimaryPointerButton(event) {
  return event.pointerType !== "mouse" || event.button === 0;
}

export function createTransformBatcher(targetEl) {
  let pendingTransform = null;
  let rafId = null;

  function schedule(value) {
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

  function flush() {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    if (pendingTransform !== null) {
      targetEl.style.transform = pendingTransform;
      pendingTransform = null;
    }
  }

  return { schedule, flush };
}

export function clearMotionDragStyles(targetEl) {
  targetEl.style.transition = "none";
  targetEl.style.transform = "";
  targetEl.style.willChange = "";
  void targetEl.offsetWidth;
  targetEl.style.transition = "";
  clearLayerMotionDrag(targetEl);
}

export function clearExplicitMotionStyles(targetEl) {
  targetEl.style.transition = "none";
  targetEl.style.transform = "";
  targetEl.style.willChange = "";
  void targetEl.offsetHeight;
  targetEl.style.transition = "";
}

export function endExplicitMotion(targetEl) {
  clearExplicitMotionStyles(targetEl);
  targetEl.classList.remove("no-anim");
  void targetEl.offsetHeight;
}

export function capturePointer(bindEl, event) {
  if (bindEl.setPointerCapture && !bindEl.hasPointerCapture(event.pointerId)) {
    bindEl.setPointerCapture(event.pointerId);
  }
}

export function releasePointer(bindEl, activePointerId) {
  if (
    activePointerId !== null
    && bindEl.releasePointerCapture
    && bindEl.hasPointerCapture(activePointerId)
  ) {
    bindEl.releasePointerCapture(activePointerId);
  }
}

export function beginDragMotion(targetEl) {
  targetEl.style.transition = "none";
  targetEl.style.willChange = "transform";
}

export function createVelocityTracker() {
  let current = 0;
  let lastMoveAt = 0;
  let lastVelocity = 0;

  function reset(value = 0) {
    current = value;
    lastMoveAt = performance.now();
    lastVelocity = 0;
  }

  function track(next) {
    const now = performance.now();
    if (lastMoveAt > 0) {
      const elapsed = now - lastMoveAt;
      if (elapsed > 0) {
        lastVelocity = (next - current) / elapsed;
      }
    }
    current = next;
    lastMoveAt = now;
  }

  function clear() {
    current = 0;
    lastMoveAt = 0;
    lastVelocity = 0;
  }

  return {
    reset,
    track,
    clear,
    get current() {
      return current;
    },
    get velocity() {
      return lastVelocity;
    },
  };
}

export function restoreAfterDragAbort({
  wasDragging,
  flushTransform,
  clearDragStyles,
  releasePointer: releasePointerFn,
}) {
  flushTransform();
  if (wasDragging) {
    clearDragStyles();
  }
  releasePointerFn();
}

/** Android WebView: block native scroll once factory predicates say a drag is active. */
export function bindAndroidTouchmoveGuard(bindEl, getActive, shouldPreventDefault) {
  bindEl.addEventListener("touchmove", (event) => {
    if (!getActive()) return;
    if (shouldPreventDefault(event)) {
      event.preventDefault();
    }
  }, { passive: false });
}

/** Shared pointerdown/move/up/cancel + optional Android touchmove guard for drag factories. */
export function bindPointerDragLifecycle(bindEl, {
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  androidTouchmove,
}) {
  bindEl.addEventListener("pointerdown", onPointerDown);
  bindEl.addEventListener("pointermove", onPointerMove, { passive: false });
  bindEl.addEventListener("pointerup", onPointerUp);
  bindEl.addEventListener("pointercancel", onPointerCancel);
  if (androidTouchmove) {
    bindAndroidTouchmoveGuard(
      bindEl,
      androidTouchmove.getActive,
      androidTouchmove.shouldPreventDefault,
    );
  }
}
