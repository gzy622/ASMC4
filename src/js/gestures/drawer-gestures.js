import { appShell, drawer } from "../dom-refs.js";
import { openDrawer, closeDrawer } from "../ui/drawer.js";
import { clearAllLongPressTimers, setLongPressTriggered, setSuppressNextCardClick } from "../runtime.js";
import {
  canContinueDrawerEdgeOpen,
  canStartDrawerEdgeOpen,
  canStartDrawerInnerClose,
  canStartDrawerShellClose,
} from "./gesture-guards.js";
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

// ── 边缘左滑打开 ──

createHorizontalDragGesture(appShell, {
  targetEl: drawer,
  getClosedPx: drawerClosedPx,
  getBasePx: drawerClosedPx,
  traceLabel: "drawer.edgeSwipe",
  shouldStart: canStartDrawerEdgeOpen,
  shouldContinueMove: canContinueDrawerEdgeOpen,
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
      openDrawer({ withTransitionLock: false, deferShadow: false });
    }
  },
});

// ── 侧栏内左滑关闭 ──

createHorizontalDragGesture(drawer, {
  targetEl: drawer,
  getClosedPx: drawerClosedPx,
  traceLabel: "drawer.close",
  shouldStart: canStartDrawerInnerClose,
  getReleaseTargetPx: ({ dx, velocity, closedPx }) => shouldReleaseBySwipe(dx, velocity, -1) ? closedPx : 0,
  onRelease: (dx, wasDragging, velocity) => {
    if (shouldReleaseBySwipe(dx, velocity, -1)) closeDrawer({ withTransitionLock: false });
  },
});

// ── 空白区左滑关闭 ──

createHorizontalDragGesture(appShell, {
  targetEl: drawer,
  getClosedPx: drawerClosedPx,
  traceLabel: "drawer.shellClose",
  shouldStart: canStartDrawerShellClose,
  getReleaseTargetPx: ({ dx, velocity, closedPx }) => shouldReleaseBySwipe(dx, velocity, -1) ? closedPx : 0,
  onRelease: (dx, wasDragging, velocity) => {
    if (shouldReleaseBySwipe(dx, velocity, -1)) closeDrawer({ withTransitionLock: false });
  },
});
