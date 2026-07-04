import { appShell, drawer, quickPanel, newAssignmentPanel, scoreSheet } from "../dom-refs.js";
import { openDrawer, closeDrawer } from "../ui/drawer.js";
import { clearAllLongPressTimers, setLongPressTriggered, setSuppressNextCardClick, isUiTransitionBusy } from "../runtime.js";
import { DRAG_CLOSE_THRESHOLD, FLING_VELOCITY_THRESHOLD, MIN_FLING_DISTANCE } from "./constants.js";
import { createHorizontalDragGesture } from "./horizontal-drag.js";

function drawerClosedPx() {
  return -1.2 * drawer.offsetWidth;
}

function shouldReleaseBySwipe(dx, velocity, direction) {
  if (velocity * direction <= -FLING_VELOCITY_THRESHOLD) return false;
  return (
    dx * direction >= DRAG_CLOSE_THRESHOLD
    || (dx * direction >= MIN_FLING_DISTANCE && velocity * direction >= FLING_VELOCITY_THRESHOLD)
  );
}

/* ── Phone swipe → open drawer ── */

createHorizontalDragGesture(appShell, {
  targetEl: drawer,
  getClosedPx: drawerClosedPx,
  getBasePx: drawerClosedPx,
  traceLabel: "drawer.edgeSwipe",
  shouldStart: (event) => {
    if (event.target.closest(".drawer, .score-sheet, .top-sheet, .modal-panel, .fullscreen-panel, .nav-button, .icon-button, .title-wrap")) return false;
    if (isUiTransitionBusy("drawer")) return false;
    if (quickPanel.classList.contains("is-open")) return false;
    if (newAssignmentPanel.classList.contains("is-open")) return false;
    if (scoreSheet.classList.contains("is-open")) return false;
    return true;
  },
  shouldContinueMove: () => !drawer.classList.contains("is-open") && !scoreSheet.classList.contains("is-open"),
  getReleaseTargetPx: ({ dx, velocity, closedPx }) => shouldReleaseBySwipe(dx, velocity, +1) ? 0 : closedPx,
  onTrackMove: (dx, dy) => {
    if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
      clearAllLongPressTimers();
      setLongPressTriggered(false);
    }
  },
  onRelease: (dx, wasDragging, velocity) => {
    if (shouldReleaseBySwipe(dx, velocity, +1)) {
      setSuppressNextCardClick(true);
      openDrawer({ withTransitionLock: false });
    }
  },
});

/* ── Drawer swipe → close drawer ── */

createHorizontalDragGesture(drawer, {
  targetEl: drawer,
  getClosedPx: drawerClosedPx,
  traceLabel: "drawer.close",
  shouldStart: (event) => {
    if (isUiTransitionBusy("drawer")) return false;
    if (event.target.closest(".drawer-filter")) return false;
    return true;
  },
  getReleaseTargetPx: ({ dx, velocity, closedPx }) => shouldReleaseBySwipe(dx, velocity, -1) ? closedPx : 0,
  onRelease: (dx, wasDragging, velocity) => {
    if (shouldReleaseBySwipe(dx, velocity, -1)) closeDrawer({ withTransitionLock: false });
  },
});

/* ── Empty area swipe → close drawer ── */

createHorizontalDragGesture(appShell, {
  targetEl: drawer,
  getClosedPx: drawerClosedPx,
  traceLabel: "drawer.shellClose",
  shouldStart: (event) => {
    if (isUiTransitionBusy("drawer")) return false;
    if (!drawer.classList.contains("is-open")) return false;
    return !event.target.closest(".drawer, .score-sheet, .top-sheet, .modal-panel, .fullscreen-panel, .nav-button, .icon-button, .title-wrap");
  },
  getReleaseTargetPx: ({ dx, velocity, closedPx }) => shouldReleaseBySwipe(dx, velocity, -1) ? closedPx : 0,
  onRelease: (dx, wasDragging, velocity) => {
    if (shouldReleaseBySwipe(dx, velocity, -1)) closeDrawer({ withTransitionLock: false });
  },
});
