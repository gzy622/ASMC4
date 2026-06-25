import { phoneEl, drawer, drawerScrim } from "../dom-refs.js";
import { openDrawer, closeDrawer } from "../ui/drawer.js";
import { clearAllLongPressTimers, setLongPressTriggered, setSuppressNextCardClick, overlayTransitionBusy } from "../runtime.js";

const DRAG_START_THRESHOLD = 8;
const DRAG_CLOSE_THRESHOLD = 50;
const DRAG_SLOPE = 1.5;

function drawerClosedPx() {
  return -1.2 * drawer.offsetWidth;
}

/* ── Phone swipe → open drawer ── */

let phoneStartX = null;
let phoneStartY = null;
let phoneDragging = false;
let cachedClosedPx = null;

phoneEl.addEventListener("touchstart", (event) => {
  if (event.target.closest(".drawer, .score-sheet, .center-panel, .nav-button, .icon-button, .title-wrap")) return;
  if (overlayTransitionBusy) return;
  const touch = event.touches[0];
  phoneStartX = touch.clientX;
  phoneStartY = touch.clientY;
  phoneDragging = false;
}, { passive: true });

phoneEl.addEventListener("touchmove", (event) => {
  if (phoneStartX === null) return;
  if (drawer.classList.contains("is-open")) {
    phoneStartX = null;
    phoneStartY = null;
    phoneDragging = false;
    cachedClosedPx = null;
    return;
  }
  const touch = event.touches[0];
  const dx = touch.clientX - phoneStartX;
  const dy = touch.clientY - phoneStartY;

  if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
    clearAllLongPressTimers();
    setLongPressTriggered(false);
  }

  if (Math.abs(dx) > 2 && Math.abs(dx) > Math.abs(dy)) {
    event.preventDefault();
  }

  if (!phoneDragging) {
    if (Math.abs(dx) > DRAG_START_THRESHOLD && Math.abs(dx) > Math.abs(dy) * DRAG_SLOPE) {
      phoneDragging = true;
      drawer.style.transition = "none";
      phoneStartX = touch.clientX;
      phoneStartY = touch.clientY;
      cachedClosedPx = drawerClosedPx();
    }
    return;
  }

  const closedPx = cachedClosedPx;
  const clamped = Math.max(closedPx, Math.min(0, closedPx + dx));
  drawer.style.transform = `translateX(${clamped}px)`;
  event.preventDefault();
}, { passive: false });

phoneEl.addEventListener("touchend", (event) => {
  if (phoneStartX === null) return;
  if (drawer.classList.contains("is-open")) {
    phoneStartX = null;
    phoneStartY = null;
    phoneDragging = false;
    cachedClosedPx = null;
    return;
  }
  const touch = event.changedTouches[0];
  const dx = touch.clientX - phoneStartX;
  const wasDragging = phoneDragging;

  phoneStartX = null;
  phoneStartY = null;
  phoneDragging = false;
  cachedClosedPx = null;

  if (wasDragging) {
    drawer.style.transition = "";
    drawer.style.transform = "";

    if (dx >= DRAG_CLOSE_THRESHOLD) {
      setSuppressNextCardClick(true);
      openDrawer();
    }
  }
});

phoneEl.addEventListener("touchcancel", () => {
  if (phoneDragging) {
    drawer.style.transition = "";
    drawer.style.transform = "";
  }
  phoneStartX = null;
  phoneStartY = null;
  phoneDragging = false;
  cachedClosedPx = null;
});

/* ── Drawer swipe → close drawer ── */

let drawerStartX = null;
let drawerStartY = null;
let drawerDragging = false;

drawer.addEventListener("touchstart", (event) => {
  if (overlayTransitionBusy) return;
  const touch = event.touches[0];
  drawerStartX = touch.clientX;
  drawerStartY = touch.clientY;
  drawerDragging = false;
}, { passive: true });

drawer.addEventListener("touchmove", (event) => {
  if (drawerStartX === null) return;
  const touch = event.touches[0];
  const dx = touch.clientX - drawerStartX;
  const dy = touch.clientY - drawerStartY;

  if (Math.abs(dx) > 2 && Math.abs(dx) > Math.abs(dy)) {
    event.preventDefault();
  }

  if (!drawerDragging) {
    if (Math.abs(dx) > DRAG_START_THRESHOLD && Math.abs(dx) > Math.abs(dy) * DRAG_SLOPE) {
      drawerDragging = true;
      drawer.style.transition = "none";
      drawerStartX = touch.clientX;
      drawerStartY = touch.clientY;
      cachedClosedPx = drawerClosedPx();
    }
    return;
  }

  const closedPx = cachedClosedPx;
  const clamped = Math.max(closedPx, Math.min(0, dx));
  drawer.style.transform = `translateX(${clamped}px)`;
  event.preventDefault();
}, { passive: false });

drawer.addEventListener("touchend", (event) => {
  if (drawerStartX === null) return;
  const touch = event.changedTouches[0];
  const dx = touch.clientX - drawerStartX;
  const wasDragging = drawerDragging;

  drawerStartX = null;
  drawerStartY = null;
  drawerDragging = false;
  cachedClosedPx = null;

  if (wasDragging) {
    drawer.style.transition = "";
    drawer.style.transform = "";

    if (Math.abs(dx) >= DRAG_CLOSE_THRESHOLD) {
      closeDrawer();
    }
  }
});

drawer.addEventListener("touchcancel", () => {
  if (drawerDragging) {
    drawer.style.transition = "";
    drawer.style.transform = "";
  }
  drawerStartX = null;
  drawerStartY = null;
  drawerDragging = false;
  cachedClosedPx = null;
});

/* ── Scrim swipe → close drawer ── */

let scrimStartX = null;
let scrimStartY = null;
let scrimDragging = false;

drawerScrim.addEventListener("touchstart", (event) => {
  if (overlayTransitionBusy) return;
  if (!drawer.classList.contains("is-open")) return;
  const touch = event.touches[0];
  scrimStartX = touch.clientX;
  scrimStartY = touch.clientY;
  scrimDragging = false;
}, { passive: true });

drawerScrim.addEventListener("touchmove", (event) => {
  if (scrimStartX === null) return;
  const touch = event.touches[0];
  const dx = touch.clientX - scrimStartX;
  const dy = touch.clientY - scrimStartY;

  if (Math.abs(dx) > 2 && Math.abs(dx) > Math.abs(dy)) {
    event.preventDefault();
  }

  if (!scrimDragging) {
    if (Math.abs(dx) > DRAG_START_THRESHOLD && Math.abs(dx) > Math.abs(dy) * DRAG_SLOPE) {
      scrimDragging = true;
      drawer.style.transition = "none";
      scrimStartX = touch.clientX;
      scrimStartY = touch.clientY;
      cachedClosedPx = drawerClosedPx();
    }
    return;
  }

  const closedPx = cachedClosedPx;
  const clamped = Math.max(closedPx, Math.min(0, dx));
  drawer.style.transform = `translateX(${clamped}px)`;
  event.preventDefault();
}, { passive: false });

drawerScrim.addEventListener("touchend", (event) => {
  if (scrimStartX === null) return;
  const touch = event.changedTouches[0];
  const dx = touch.clientX - scrimStartX;
  const wasDragging = scrimDragging;

  scrimStartX = null;
  scrimStartY = null;
  scrimDragging = false;
  cachedClosedPx = null;

  if (wasDragging) {
    drawer.style.transition = "";
    drawer.style.transform = "";

    if (Math.abs(dx) >= DRAG_CLOSE_THRESHOLD) {
      closeDrawer();
    }
  }
});

drawerScrim.addEventListener("touchcancel", () => {
  if (scrimDragging) {
    drawer.style.transition = "";
    drawer.style.transform = "";
  }
  scrimStartX = null;
  scrimStartY = null;
  scrimDragging = false;
  cachedClosedPx = null;
});
