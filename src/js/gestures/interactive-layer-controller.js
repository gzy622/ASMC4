import { DRAG_START_THRESHOLD, DRAG_SLOPE, FLING_VELOCITY_THRESHOLD, MIN_FLING_DISTANCE } from "./constants.js";
import { animateMotionRelease } from "./gesture-motion-engine.js";
import {
  beginLayerDrag,
  beginLayerReleaseAnimation,
  clearLayerMotionDrag,
  endLayerReleaseAnimation,
} from "./layer-motion-state.js";
import { claimDirection, releaseDirection, setUiTransitionBusy } from "../runtime.js";
import { traceGesture } from "../utils/trace.js";
import {
  bindPointerDragLifecycle,
  capturePointer,
  createTransformBatcher,
  createVelocityTracker,
  isPrimaryPointerButton,
  releasePointer,
} from "./pointer-drag-lifecycle.js";

const interactiveControllers = new Set();
const pendingDragClickCleanups = new Set();
let activeScrimController = null;

const DEFAULT_SCRIM_MAX_OPACITY = 0.18;
const OPEN_PRESSURE_DISTANCE_PX = 48;

function armDragClickGuard(pointerUpEvent) {
  const startedAt = performance.now();
  const x = pointerUpEvent.clientX;
  const y = pointerUpEvent.clientY;
  let timer = null;

  const cleanup = () => {
    window.removeEventListener("click", onClick, true);
    if (timer !== null) clearTimeout(timer);
    pendingDragClickCleanups.delete(cleanup);
  };

  const onClick = event => {
    const elapsed = performance.now() - startedAt;
    const distance = Math.hypot(event.clientX - x, event.clientY - y);
    if (elapsed > 500) {
      cleanup();
      return;
    }
    if (distance > 36) return;
    cleanup();
    event.preventDefault();
    event.stopImmediatePropagation();
  };

  window.addEventListener("click", onClick, true);
  timer = setTimeout(cleanup, 500);
  pendingDragClickCleanups.add(cleanup);
}

function axisTranslate(axis, value) {
  return axis === "x" ? `translateX(${value}px)` : `translateY(${value}px)`;
}

function readTranslate(el, axis) {
  const transform = getComputedStyle(el).transform;
  if (!transform || transform === "none") return 0;
  try {
    const matrix = new DOMMatrixReadOnly(transform);
    return axis === "x" ? matrix.m41 : matrix.m42;
  } catch {
    const match = transform.match(/^matrix\(([^)]+)\)$/);
    if (!match) return 0;
    const values = match[1].split(",").map(Number);
    return axis === "x" ? values[4] || 0 : values[5] || 0;
  }
}

function defaultSetOpenState(el, open) {
  el.classList.toggle("is-open", open);
  el.setAttribute("aria-hidden", open ? "false" : "true");
}

export function createInteractiveLayerController({
  stateEl,
  motionEl = stateEl,
  axis,
  getClosedPx,
  getOpenPx = () => 0,
  busyKey,
  traceLabel,
  durationScale = 1,
  scrimEl = null,
  scrimMaxOpacity = DEFAULT_SCRIM_MAX_OPACITY,
  setOpenState = open => defaultSetOpenState(stateEl, open),
  onPrepareClosedDrag,
  onCancelClosedDrag,
  onBeforeOpen,
  onOpened,
  onBeforeClose,
  onClosed,
  onDragStarted,
  onOpenPressure,
}) {
  let api = null;
  let phase = stateEl.classList.contains("is-open") ? "open" : "closed";
  let target = phase === "open" ? "open" : "closed";
  let generation = 0;
  let activeAnimation = null;
  let dragPreparedFromClosed = false;
  let awaitingFirstDragTransform = false;
  let openPressure = 0;
  let dragPx = phase === "open" ? getOpenPx() : getClosedPx();
  const batcher = createTransformBatcher(motionEl, () => {
    syncScrim(dragPx);
    if (awaitingFirstDragTransform) {
      awaitingFirstDragTransform = false;
      trace("first-transform");
    }
  });

  function scrimOpacityAt(px) {
    const closedPx = getClosedPx();
    const openPx = getOpenPx();
    const range = openPx - closedPx;
    if (!range) return scrimMaxOpacity;
    const progress = Math.max(0, Math.min(1, (px - closedPx) / range));
    return progress * scrimMaxOpacity;
  }

  function claimScrim() {
    if (!scrimEl) return;
    activeScrimController = api;
    scrimEl.classList.add("is-visible");
  }

  function syncScrim(px) {
    if (!scrimEl) return;
    const opacity = scrimOpacityAt(px);
    if (activeScrimController !== api) {
      if (opacity <= 0) return;
      claimScrim();
    }
    scrimEl.style.opacity = String(opacity);
  }

  function releaseScrim() {
    if (!scrimEl || activeScrimController !== api) return;
    scrimEl.style.opacity = "0";
    scrimEl.classList.remove("is-visible");
    activeScrimController = null;
  }

  function trace(step, data = {}) {
    traceGesture(traceLabel, step, {
      phase,
      target,
      generation,
      position: Math.round(dragPx * 100) / 100,
      ...data,
    });
  }

  function setBusy(active) {
    if (busyKey) setUiTransitionBusy(active, busyKey);
  }

  function setOpenPressure(nextPressure) {
    const normalized = Math.max(0, Math.min(1, nextPressure));
    if (normalized === openPressure) return;
    openPressure = normalized;
    onOpenPressure?.(normalized);
  }

  function cancelAnimation({ freeze = false } = {}) {
    if (!activeAnimation) return dragPx;
    if (freeze) {
      dragPx = readTranslate(motionEl, axis);
    }
    generation += 1;
    activeAnimation.cancel();
    activeAnimation = null;
    if (freeze) {
      motionEl.style.transform = axisTranslate(axis, dragPx);
      syncScrim(dragPx);
    }
    endLayerReleaseAnimation(stateEl);
    return dragPx;
  }

  function clearStableStyles() {
    setOpenPressure(0);
    awaitingFirstDragTransform = false;
    batcher.flush();
    motionEl.style.transition = "none";
    motionEl.style.transform = "";
    motionEl.style.willChange = "";
    requestAnimationFrame(() => {
      if (phase === "open" || phase === "closed") {
        motionEl.style.transition = "";
      }
    });
    clearLayerMotionDrag(stateEl);
  }

  function complete(nextTarget, currentGeneration) {
    if (currentGeneration !== generation) return;
    activeAnimation = null;
    target = nextTarget;
    phase = nextTarget === "open" ? "open" : "closed";
    dragPx = nextTarget === "open" ? getOpenPx() : getClosedPx();
    setOpenState(nextTarget === "open");
    if (nextTarget === "open") onOpened?.();
    clearStableStyles();
    if (nextTarget === "open") syncScrim(dragPx);
    else releaseScrim();
    setBusy(false);
    if (nextTarget === "closed") onClosed?.();
    dragPreparedFromClosed = false;
    trace("complete");
  }

  function animateTo(nextTarget, velocity = 0, { explicit = false } = {}) {
    const closedPx = getClosedPx();
    const toPx = nextTarget === "open" ? getOpenPx() : closedPx;
    const fromPx = Number.isFinite(dragPx) ? dragPx : readTranslate(motionEl, axis);
    generation += 1;
    const currentGeneration = generation;
    target = nextTarget;
    phase = nextTarget === "open"
      ? (explicit ? "opening" : "settling-open")
      : (explicit ? "closing" : "settling-close");

    if (nextTarget === "open") {
      setOpenState(true);
      onBeforeOpen?.();
    } else {
      onBeforeClose?.();
    }

    beginLayerReleaseAnimation(stateEl, nextTarget);
    setBusy(true);
    motionEl.style.transition = "none";
    motionEl.style.willChange = "transform";
    motionEl.style.transform = axisTranslate(axis, fromPx);
    dragPx = fromPx;
    if (nextTarget === "open") claimScrim();
    syncScrim(fromPx);
    trace("start", { explicit, velocity });

    activeAnimation = animateMotionRelease(
      motionEl,
      axis,
      fromPx,
      toPx,
      velocity,
      scrimEl ? {
        el: scrimEl,
        prop: "opacity",
        fromValue: String(scrimOpacityAt(fromPx)),
        toValue: String(scrimOpacityAt(toPx)),
      } : null,
      null,
      durationScale,
    );
    activeAnimation.finished.then(() => complete(nextTarget, currentGeneration));
    return activeAnimation.finished;
  }

  function request(nextTarget, { animate = true, velocity = 0, explicit = true } = {}) {
    if (nextTarget === "open") {
      interactiveControllers.forEach(controller => {
        if (controller === api) return;
        if (controller.phase === "closing" || controller.phase === "settling-close") {
          controller.close({ animate: false });
        }
      });
    }
    if (phase === nextTarget && !activeAnimation) return Promise.resolve();
    if (animate && activeAnimation && target === nextTarget) return activeAnimation.finished;
    if (activeAnimation) cancelAnimation({ freeze: true });
    else if (phase === "open") dragPx = getOpenPx();
    else if (phase === "closed") dragPx = getClosedPx();

    if (!animate) {
      generation += 1;
      target = nextTarget;
      if (nextTarget === "closed") onBeforeClose?.();
      phase = nextTarget;
      setOpenState(nextTarget === "open");
      dragPx = nextTarget === "open" ? getOpenPx() : getClosedPx();
      if (nextTarget === "open") onOpened?.();
      clearStableStyles();
      if (nextTarget === "open") syncScrim(dragPx);
      else releaseScrim();
      setBusy(false);
      if (nextTarget === "closed") onClosed?.();
      trace("snap");
      return Promise.resolve();
    }
    return animateTo(nextTarget, velocity, { explicit });
  }

  function holdAtCurrentFrame() {
    if (!activeAnimation) return null;
    const resumeTarget = target;
    setOpenPressure(0);
    cancelAnimation({ freeze: true });
    phase = "holding";
    beginLayerDrag(stateEl);
    setBusy(true);
    trace("hold", { resumeTarget });
    return { px: dragPx, target: resumeTarget };
  }

  function prepareDrag({ fromClosed = false } = {}) {
    setOpenPressure(0);
    if (activeAnimation) cancelAnimation({ freeze: true });
    if (fromClosed) {
      dragPx = getClosedPx();
      dragPreparedFromClosed = true;
      onPrepareClosedDrag?.();
    } else if (phase === "open") {
      dragPx = getOpenPx();
    } else if (phase === "closed") {
      dragPx = getClosedPx();
    }
    phase = "dragging";
    onDragStarted?.();
    beginLayerDrag(stateEl);
    setBusy(true);
    motionEl.style.transition = "none";
    motionEl.style.willChange = "transform";
    motionEl.style.transform = axisTranslate(axis, dragPx);
    awaitingFirstDragTransform = true;
    syncScrim(dragPx);
    trace("claim");
    return dragPx;
  }

  function setDragPosition(rawPx) {
    const closedPx = getClosedPx();
    const openPx = getOpenPx();
    const min = Math.min(closedPx, openPx);
    const max = Math.max(closedPx, openPx);
    dragPx = Math.max(min, Math.min(max, rawPx));
    const openDirection = Math.sign(openPx - closedPx) || 1;
    const openOverflow = Math.max(0, (rawPx - openPx) * openDirection);
    setOpenPressure(openOverflow / OPEN_PRESSURE_DISTANCE_PX);
    batcher.schedule(axisTranslate(axis, dragPx));
    return dragPx;
  }

  function settle(nextTarget, velocity = 0) {
    batcher.flush();
    setOpenPressure(0);
    dragPx = readTranslate(motionEl, axis);
    if (nextTarget === "open" && dragPreparedFromClosed) {
      setOpenState(true);
      dragPreparedFromClosed = false;
    }
    if (nextTarget === "closed" && dragPreparedFromClosed) {
      onCancelClosedDrag?.();
    }
    trace("settle", { nextTarget, velocity });
    return animateTo(nextTarget, velocity);
  }

  function resumeHeld(resumeTarget) {
    if (phase !== "holding" && phase !== "dragging") return;
    trace("resume", { resumeTarget });
    settle(resumeTarget, 0);
  }

  function cancel() {
    cancelAnimation();
    generation += 1;
    setBusy(false);
    clearStableStyles();
    phase = stateEl.classList.contains("is-open") ? "open" : "closed";
    target = phase === "open" ? "open" : "closed";
    dragPx = phase === "open" ? getOpenPx() : getClosedPx();
    if (phase === "open") syncScrim(dragPx);
    else releaseScrim();
    trace("cancel");
  }

  api = {
    open: options => request("open", options),
    close: options => request("closed", options),
    snapClosed: () => request("closed", { animate: false }),
    snapOpen: () => request("open", { animate: false }),
    holdAtCurrentFrame,
    prepareDrag,
    setDragPosition,
    settle,
    resumeHeld,
    cancel,
    getClosedPx,
    getOpenPx,
    get phase() { return phase; },
    get target() { return target; },
    get currentPx() { return dragPx; },
    get isAnimating() { return Boolean(activeAnimation); },
  };
  interactiveControllers.add(api);
  return api;
}

export function bindInteractiveLayerGesture(bindEl, controller, {
  axis,
  shouldStart = () => true,
  shouldContinue = () => true,
  canStartFromClosed = false,
  onPrepareClosed,
  onCancelClosed,
  onPointerPrepare,
  onPointerCleanup,
  onDragStart,
  onProgress,
  decideTarget,
  traceLabel,
}) {
  let pointerId = null;
  let startMain = 0;
  let startCross = 0;
  let basePx = 0;
  let dragging = false;
  let held = false;
  let resumeTarget = null;
  let startedFromClosed = false;
  const velocity = createVelocityTracker();

  function mainPoint(event) { return axis === "x" ? event.clientX : event.clientY; }
  function crossPoint(event) { return axis === "x" ? event.clientY : event.clientX; }

  function reset({ release = true } = {}) {
    const resetState = { dragging, held, startedFromClosed };
    if (release) releasePointer(bindEl, pointerId);
    releaseDirection(pointerId);
    pointerId = null;
    dragging = false;
    held = false;
    resumeTarget = null;
    startedFromClosed = false;
    velocity.clear();
    onPointerCleanup?.(resetState);
  }

  function resumeOrCancel() {
    if (dragging && startedFromClosed) {
      onCancelClosed?.();
      controller.settle("closed", 0);
      return;
    }
    if ((held || dragging) && resumeTarget) controller.resumeHeld(resumeTarget);
  }

  function onPointerDown(event) {
    if (pointerId !== null || !isPrimaryPointerButton(event)) return;
    if (!shouldStart(event, controller)) return;

    const hold = controller.isAnimating ? controller.holdAtCurrentFrame() : null;
    const stableClosed = controller.phase === "closed";
    if (!hold && stableClosed && !canStartFromClosed) return;

    pointerId = event.pointerId;
    startMain = mainPoint(event);
    startCross = crossPoint(event);
    held = Boolean(hold);
    resumeTarget = hold?.target || (stableClosed ? "closed" : "open");
    startedFromClosed = !hold && stableClosed;
    basePx = hold?.px ?? (stableClosed ? controller.getClosedPx() : controller.getOpenPx());
    velocity.reset(basePx);
    onPointerPrepare?.({ startedFromClosed, held });
    if (traceLabel) traceGesture(traceLabel, hold ? "hold" : "pointerdown");
  }

  function onPointerMove(event) {
    if (event.pointerId !== pointerId) return;
    if (!dragging && !held && !shouldContinue(event, controller)) {
      resumeOrCancel();
      reset();
      return;
    }
    const delta = mainPoint(event) - startMain;
    const crossDelta = crossPoint(event) - startCross;

    if (!dragging) {
      if (Math.abs(delta) < DRAG_START_THRESHOLD && Math.abs(crossDelta) < DRAG_START_THRESHOLD) return;
      if (Math.abs(crossDelta) > Math.abs(delta) * DRAG_SLOPE) {
        resumeOrCancel();
        reset();
        return;
      }
      if (Math.abs(delta) < Math.abs(crossDelta) * DRAG_SLOPE) return;
      const dir = axis === "x" ? "h" : "v";
      if (claimDirection(event.pointerId, dir) !== dir) {
        resumeOrCancel();
        reset();
        return;
      }
      dragging = true;
      capturePointer(bindEl, event);
      if (startedFromClosed) onPrepareClosed?.();
      basePx = controller.prepareDrag({ fromClosed: startedFromClosed });
      onDragStart?.();
      velocity.reset(basePx);
    }

    const nextPx = controller.setDragPosition(basePx + delta);
    velocity.track(nextPx);
    const closedPx = controller.getClosedPx();
    const openPx = controller.getOpenPx();
    const range = openPx - closedPx;
    const progress = range === 0 ? 1 : (nextPx - closedPx) / range;
    onProgress?.(Math.max(0, Math.min(1, progress)));
    event.preventDefault();
  }

  function onPointerUp(event) {
    if (event.pointerId !== pointerId) return;
    if (!dragging) {
      resumeOrCancel();
      reset();
      return;
    }

    const delta = mainPoint(event) - startMain;
    const currentPx = controller.currentPx;
    const closedPx = controller.getClosedPx();
    const speed = velocity.velocity;
    let nextTarget;
    if (decideTarget) {
      nextTarget = decideTarget({ delta, currentPx, closedPx, velocity: speed, startedFromClosed, resumeTarget, wasHeld: held });
    } else if (Math.abs(delta) >= MIN_FLING_DISTANCE && Math.abs(speed) >= FLING_VELOCITY_THRESHOLD) {
      const openDirection = Math.sign(controller.getOpenPx() - closedPx);
      nextTarget = Math.sign(speed) === openDirection ? "open" : "closed";
    } else {
      const openPx = controller.getOpenPx();
      nextTarget = Math.abs(currentPx - openPx) <= Math.abs(currentPx - closedPx) ? "open" : "closed";
    }
    armDragClickGuard(event);
    controller.settle(nextTarget, speed);
    reset();
  }

  function onPointerCancel(event) {
    if (event.pointerId !== pointerId) return;
    resumeOrCancel();
    reset();
  }

  bindPointerDragLifecycle(bindEl, {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    androidTouchmove: {
      getActive: () => pointerId !== null && dragging,
      shouldPreventDefault: event => {
        const touch = event.touches[0];
        if (!touch) return false;
        const main = axis === "x" ? touch.clientX : touch.clientY;
        const cross = axis === "x" ? touch.clientY : touch.clientX;
        return Math.abs(main - startMain) > Math.abs(cross - startCross) * DRAG_SLOPE;
      },
    },
  });

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden || pointerId === null) return;
    resumeOrCancel();
    reset();
  });
}
