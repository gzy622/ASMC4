const DRAG_START_THRESHOLD = 8;

export function createVerticalDragGesture(el, { closeDirection, onClose, threshold = 80, slope = 1.5 }) {
  let startY = null;
  let startX = null;
  let dragging = false;
  let currentDelta = 0;

  function handleTouchStart(event) {
    const touch = event.touches[0];
    startY = touch.clientY;
    startX = touch.clientX;
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
      startY = touch.clientY;
      startX = touch.clientX;
      return;
    }

    let clamped;
    if (closeDirection < 0) {
      clamped = Math.min(0, dy);
    } else {
      clamped = Math.max(0, dy);
    }

    currentDelta = clamped;
    el.style.transform = `translateY(${clamped}px)`;
    event.preventDefault();
  }

  function handleTouchEnd() {
    if (startY === null) return;
    const wasDragging = dragging;
    const delta = currentDelta;

    startY = null;
    startX = null;
    dragging = false;
    currentDelta = 0;

    if (!wasDragging) return;

    el.style.transition = "";
    el.style.transform = "";

    if (Math.abs(delta) >= threshold) {
      onClose();
    }
  }

  function handleTouchCancel() {
    if (dragging) {
      el.style.transition = "";
      el.style.transform = "";
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
