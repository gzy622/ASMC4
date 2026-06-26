import { phoneEl, drawer, drawerScrim } from "../dom-refs.js";
import { openDrawer, closeDrawer } from "../ui/drawer.js";
import { clearAllLongPressTimers, setLongPressTriggered, setSuppressNextCardClick, overlayTransitionBusy } from "../runtime.js";
import { DRAG_CLOSE_THRESHOLD } from "./constants.js";
import { createHorizontalDragGesture } from "./horizontal-drag.js";

function drawerClosedPx() {
  return -1.2 * drawer.offsetWidth;
}

/* ── Phone swipe → open drawer ── */

createHorizontalDragGesture(phoneEl, {
  targetEl: drawer,
  getClosedPx: drawerClosedPx,
  getBasePx: drawerClosedPx,
  shouldStart: (event) => {
    if (event.target.closest(".drawer, .score-sheet, .center-panel, .nav-button, .icon-button, .title-wrap")) return false;
    if (overlayTransitionBusy) return false;
    return true;
  },
  shouldContinueMove: () => !drawer.classList.contains("is-open"),
  onTrackMove: (dx, dy) => {
    if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
      clearAllLongPressTimers();
      setLongPressTriggered(false);
    }
  },
  onRelease: (dx) => {
    if (dx >= DRAG_CLOSE_THRESHOLD) {
      setSuppressNextCardClick(true);
      openDrawer();
      return true;
    }
    return false;
  },
});

/* ── Drawer swipe → close drawer ── */

createHorizontalDragGesture(drawer, {
  targetEl: drawer,
  getClosedPx: drawerClosedPx,
  shouldStart: () => !overlayTransitionBusy,
  onRelease: (dx) => {
    if (dx <= -DRAG_CLOSE_THRESHOLD) {
      closeDrawer();
      return true;
    }
    return false;
  },
});

/* ── Scrim swipe → close drawer ── */

createHorizontalDragGesture(drawerScrim, {
  targetEl: drawer,
  getClosedPx: drawerClosedPx,
  shouldStart: () => !overlayTransitionBusy && drawer.classList.contains("is-open"),
  onRelease: (dx) => {
    if (dx <= -DRAG_CLOSE_THRESHOLD) {
      closeDrawer();
      return true;
    }
    return false;
  },
});
