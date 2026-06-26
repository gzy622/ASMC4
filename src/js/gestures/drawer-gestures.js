import { phoneEl, drawer, drawerScrim } from "../dom-refs.js";
import { openDrawer, closeDrawer } from "../ui/drawer.js";
import { clearAllLongPressTimers, setLongPressTriggered, setSuppressNextCardClick, overlayTransitionBusy } from "../runtime.js";
import { DRAG_CLOSE_THRESHOLD, FLING_VELOCITY_THRESHOLD, MIN_FLING_DISTANCE } from "./constants.js";
import { createHorizontalDragGesture } from "./horizontal-drag.js";

function drawerClosedPx() {
  return -1.2 * drawer.offsetWidth;
}

function scrimProgress(px, closedPx) {
  const range = -closedPx;
  return range > 0 ? (px - closedPx) / range : 0;
}

function shouldReleaseBySwipe(dx, velocity, direction) {
  return (
    dx * direction >= DRAG_CLOSE_THRESHOLD
    || (dx * direction >= MIN_FLING_DISTANCE && velocity * direction >= FLING_VELOCITY_THRESHOLD)
  );
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
  getReleaseTargetPx: ({ dx, velocity, closedPx }) => shouldReleaseBySwipe(dx, velocity, +1) ? 0 : closedPx,
  onTrackMove: (dx, dy) => {
    if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
      clearAllLongPressTimers();
      setLongPressTriggered(false);
    }
  },
  onProgress: (progress) => {
    drawerScrim.style.opacity = progress;
  },
  getReleaseSecondary: ({ releasedPx, closedPx, toPx }) => ({
    el: drawerScrim,
    prop: "opacity",
    fromValue: scrimProgress(releasedPx, closedPx),
    toValue: scrimProgress(toPx, closedPx),
  }),
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
  shouldStart: () => !overlayTransitionBusy,
  getReleaseTargetPx: ({ dx, velocity, closedPx }) => shouldReleaseBySwipe(dx, velocity, -1) ? closedPx : 0,
  onProgress: (progress) => {
    drawerScrim.style.opacity = progress;
  },
  getReleaseSecondary: ({ releasedPx, closedPx, toPx }) => ({
    el: drawerScrim,
    prop: "opacity",
    fromValue: scrimProgress(releasedPx, closedPx),
    toValue: scrimProgress(toPx, closedPx),
  }),
  onRelease: (dx, wasDragging, velocity) => {
    if (shouldReleaseBySwipe(dx, velocity, -1)) closeDrawer({ withTransitionLock: false });
  },
});

/* ── Scrim swipe → close drawer ── */

createHorizontalDragGesture(drawerScrim, {
  targetEl: drawer,
  getClosedPx: drawerClosedPx,
  shouldStart: () => !overlayTransitionBusy && drawer.classList.contains("is-open"),
  getReleaseTargetPx: ({ dx, velocity, closedPx }) => shouldReleaseBySwipe(dx, velocity, -1) ? closedPx : 0,
  onProgress: (progress) => {
    drawerScrim.style.opacity = progress;
  },
  getReleaseSecondary: ({ releasedPx, closedPx, toPx }) => ({
    el: drawerScrim,
    prop: "opacity",
    fromValue: scrimProgress(releasedPx, closedPx),
    toValue: scrimProgress(toPx, closedPx),
  }),
  onRelease: (dx, wasDragging, velocity) => {
    if (shouldReleaseBySwipe(dx, velocity, -1)) closeDrawer({ withTransitionLock: false });
  },
});
