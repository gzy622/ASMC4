import { DRAG_START_THRESHOLD, VERTICAL_CLOSE_THRESHOLD } from "./constants.js";

const MOTION = "cubic-bezier(.2, .8, .2, 1)";
const MIN_DURATION = 120;
const MAX_DURATION = 320;
const VELOCITY_REF = 1.5;

export function createVerticalDragGesture(el, { closeDirection, onClose, threshold = VERTICAL_CLOSE_THRESHOLD, slope = 1.5 }) {
  let startY = null;
  let startX = null;
  let dragging = false;
  let currentDelta = 0;
  let pendingTransform = null;
  let rafId = null;
  let lastMoveY = 0;
  let lastMoveT = 0;
  let velocity = 0;

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

  function releaseAnimation(fromPx, toPx) {
    const speed = Math.abs(velocity);
    let duration = MAX_DURATION;
    if (speed > 0) {
      duration = Math.round(MAX_DURATION * VELOCITY_REF / speed);
      duration = Math.max(MIN_DURATION, Math.min(MAX_DURATION, duration));
    }
    el.style.transition = "none";
    const anim = el.animate(
      [
        { transform: `translateY(${fromPx}px)` },
        { transform: `translateY(${toPx}px)` },
      ],
      { duration, easing: MOTION, fill: "none" }
    );
    anim.onfinish = () => {
      el.style.transition = "";
      el.style.transform = "";
      el.style.willChange = "";
    };
    return anim;
  }

  function handleTouchStart(event) {
    const touch = event.touches[0];
    startY = touch.clientY;
    startX = touch.clientX;
    velocity = 0;
  }

  function handleTouchMove(event) {
    if (startY === null) return;
    const touch = event.touches[0];
    const dy = touch.clientY - startY;
    const dx = touch.clientX - startX;

    if (Math.abs(dy) > 2 && Math.abs(dy) > Math.abs(dx)) {
      event.preventDefault();
    }

    if (!dragging) {
      if (Math.abs(dy) < DRAG_START_THRESHOLD) return;
      if (Math.abs(dy) < Math.abs(dx) * slope) return;
      dragging = true;
      el.style.transition = "none";
      el.style.willChange = "transform";
      startY = touch.clientY;
      startX = touch.clientX;
      lastMoveY = touch.clientY;
      lastMoveT = event.timeStamp;
      return;
    }

    let clamped;
    if (closeDirection < 0) {
      clamped = Math.min(0, dy);
    } else {
      clamped = Math.max(0, dy);
    }

    currentDelta = clamped;
    scheduleTransform(`translateY(${clamped}px)`);

    const now = event.timeStamp;
    const dt = now - lastMoveT;
    if (dt > 0) {
      velocity = (touch.clientY - lastMoveY) / dt;
    }
    lastMoveY = touch.clientY;
    lastMoveT = now;

    event.preventDefault();
  }

  function handleTouchEnd() {
    if (startY === null) return;
    const wasDragging = dragging;
    const delta = currentDelta;

    flushTransform();
    startY = null;
    startX = null;
    dragging = false;
    currentDelta = 0;

    if (!wasDragging) return;

    const triggered = Math.abs(delta) >= threshold;
    if (triggered) {
      const toPx = closeDirection < 0 ? delta * 2 : delta * 2;
      releaseAnimation(delta, toPx);
      onClose();
    } else {
      releaseAnimation(delta, 0);
    }
  }

  function handleTouchCancel() {
    flushTransform();
    if (dragging) {
      el.style.transition = "";
      el.style.transform = "";
      el.style.willChange = "";
    }
    startY = null;
    startX = null;
    dragging = false;
    currentDelta = 0;
  }

  el.addEventListener("touchstart", handleTouchStart, { passive: true });
  el.addEventListener("touchmove", handleTouchMove, { passive: false });
  el.addEventListener("touchend", handleTouchEnd);
  el.addEventListener("touchcancel", handleTouchCancel);
}
