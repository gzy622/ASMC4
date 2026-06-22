import { phoneEl, drawer } from "../dom-refs.js";
import { openDrawer, closeDrawer } from "../ui/drawer.js";
import { clearAllLongPressTimers, setLongPressTriggered, setSuppressNextCardClick } from "../runtime.js";

let phoneSwipeStartX = null;
let phoneSwipeStartY = null;
let phoneSwipeGestureActive = false;
let drawerSwipeStartX = null;
let drawerSwipeStartY = null;

phoneEl.addEventListener("touchstart", (event) => {
  if (event.target.closest(".drawer, .score-sheet, .center-panel, .nav-button, .icon-button, .title-wrap")) return;
  const touch = event.touches[0];
  phoneSwipeStartX = touch.clientX;
  phoneSwipeStartY = touch.clientY;
  phoneSwipeGestureActive = false;
}, { passive: true });

phoneEl.addEventListener("touchmove", (event) => {
  if (phoneSwipeStartX === null) return;
  const touch = event.touches[0];
  const dx = touch.clientX - phoneSwipeStartX;
  const dy = touch.clientY - phoneSwipeStartY;

  if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
    clearAllLongPressTimers();
    setLongPressTriggered(false);
  }

  if (Math.abs(dx) > 15 && Math.abs(dx) > Math.abs(dy) * 1.5) {
    phoneSwipeGestureActive = true;
  }
}, { passive: true });

phoneEl.addEventListener("touchend", (event) => {
  if (phoneSwipeStartX === null) return;
  if (!phoneSwipeGestureActive) {
    phoneSwipeStartX = null;
    phoneSwipeStartY = null;
    return;
  }
  const touch = event.changedTouches[0];
  const dx = touch.clientX - phoneSwipeStartX;
  const dy = touch.clientY - phoneSwipeStartY;
  phoneSwipeStartX = null;
  phoneSwipeStartY = null;
  phoneSwipeGestureActive = false;

  const threshold = 50;
  if (Math.abs(dx) < threshold) return;
  if (Math.abs(dx) < Math.abs(dy) * 1.5) return;

  setSuppressNextCardClick(true);

  if (dx > 0 && !drawer.classList.contains("is-open")) {
    openDrawer();
  } else if (dx < 0 && drawer.classList.contains("is-open")) {
    closeDrawer();
  }
});

phoneEl.addEventListener("touchcancel", () => {
  phoneSwipeStartX = null;
  phoneSwipeStartY = null;
  phoneSwipeGestureActive = false;
});

drawer.addEventListener("touchstart", (event) => {
  const touch = event.touches[0];
  drawerSwipeStartX = touch.clientX;
  drawerSwipeStartY = touch.clientY;
}, { passive: true });

drawer.addEventListener("touchend", (event) => {
  if (drawerSwipeStartX === null) return;
  const touch = event.changedTouches[0];
  const dx = touch.clientX - drawerSwipeStartX;
  const dy = touch.clientY - drawerSwipeStartY;
  drawerSwipeStartX = null;
  drawerSwipeStartY = null;

  const threshold = 50;
  if (Math.abs(dx) < threshold) return;
  if (Math.abs(dx) < Math.abs(dy) * 1.5) return;

  if (dx < 0 && drawer.classList.contains("is-open")) {
    closeDrawer();
  }
});

drawer.addEventListener("touchcancel", () => {
  drawerSwipeStartX = null;
  drawerSwipeStartY = null;
});
