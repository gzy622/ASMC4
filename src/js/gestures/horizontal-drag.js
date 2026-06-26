import { DRAG_START_THRESHOLD, DRAG_SLOPE } from "./constants.js";

const MOTION = "cubic-bezier(.2, .8, .2, 1)";
const MIN_DURATION = 120;
const MAX_DURATION = 320;
const VELOCITY_REF = 1.5;

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
  let pendingTransform = null;
  let rafId = null;
  let lastMoveX = 0;
  let lastMoveT = 0;
  let velocity = 0;

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

  function releaseAnimation(fromPx, toPx) {
    const speed = Math.abs(velocity);
    let duration = MAX_DURATION;
    if (speed > 0) {
      duration = Math.round(MAX_DURATION * VELOCITY_REF / speed);
      duration = Math.max(MIN_DURATION, Math.min(MAX_DURATION, duration));
    }
    targetEl.style.transition = "none";
    const anim = targetEl.animate(
      [
        { transform: `translateX(${fromPx}px)` },
        { transform: `translateX(${toPx}px)` },
      ],
      { duration, easing: MOTION, fill: "none" }
    );
    anim.onfinish = () => {
      targetEl.style.transition = "";
      targetEl.style.transform = "";
      targetEl.style.willChange = "";
    };
    return anim;
  }

  bindEl.addEventListener("touchstart", (event) => {
    if (!shouldStart(event)) return;
    const touch = event.touches[0];
    startX = touch.clientX;
    startY = touch.clientY;
    dragging = false;
    velocity = 0;
  }, { passive: true });

  bindEl.addEventListener("touchmove", (event) => {
    if (startX === null) return;
    if (!shouldContinueMove(event)) {
      flushTransform();
      if (dragging) {
        targetEl.style.willChange = "";
      }
      startX = null;
      startY = null;
      dragging = false;
      return;
    }
    const touch = event.touches[0];
    const dx = touch.clientX - startX;
    const dy = touch.clientY - startY;

    if (onTrackMove) onTrackMove(dx, dy);

    if (Math.abs(dx) > 2 && Math.abs(dx) > Math.abs(dy)) {
      event.preventDefault();
    }

    if (!dragging) {
      if (Math.abs(dx) > DRAG_START_THRESHOLD && Math.abs(dx) > Math.abs(dy) * DRAG_SLOPE) {
        dragging = true;
        targetEl.style.transition = "none";
        targetEl.style.willChange = "transform";
        startX = touch.clientX;
        startY = touch.clientY;
        lastMoveX = touch.clientX;
        lastMoveT = event.timeStamp;
      }
      return;
    }

    const closedPx = getClosedPx();
    const basePx = getBasePx();
    const clamped = Math.max(closedPx, Math.min(0, basePx + dx));
    scheduleTransform(`translateX(${clamped}px)`);

    const now = event.timeStamp;
    const dt = now - lastMoveT;
    if (dt > 0) {
      velocity = (touch.clientX - lastMoveX) / dt;
    }
    lastMoveX = touch.clientX;
    lastMoveT = now;

    event.preventDefault();
  }, { passive: false });

  bindEl.addEventListener("touchend", (event) => {
    if (startX === null) return;
    if (!shouldContinueMove(event)) {
      flushTransform();
      if (dragging) {
        targetEl.style.willChange = "";
      }
      startX = null;
      startY = null;
      dragging = false;
      return;
    }
    const touch = event.changedTouches[0];
    const dx = touch.clientX - startX;
    const wasDragging = dragging;

    flushTransform();
    startX = null;
    startY = null;
    dragging = false;

    if (wasDragging) {
      const closedPx = getClosedPx();
      const basePx = getBasePx();
      const fromPx = Math.max(closedPx, Math.min(0, basePx + dx));
      const triggered = onRelease ? onRelease(dx, wasDragging) : false;
      if (triggered) {
        const toPx = basePx === closedPx ? 0 : closedPx;
        releaseAnimation(fromPx, toPx);
      } else {
        releaseAnimation(fromPx, basePx);
      }
    }
  });

  bindEl.addEventListener("touchcancel", () => {
    flushTransform();
    if (dragging) {
      targetEl.style.transition = "";
      targetEl.style.transform = "";
      targetEl.style.willChange = "";
    }
    startX = null;
    startY = null;
    dragging = false;
  });
}
