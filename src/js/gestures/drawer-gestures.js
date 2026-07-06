import { appShell, drawer } from "../dom-refs.js";
import { closeDrawer, getDrawerClosedPx, openDrawer } from "../ui/drawer.js";
import { clearAllLongPressTimers, setLongPressTriggered, setSuppressNextCardClick } from "../runtime.js";
import {
  canContinueDrawerEdgeOpen,
  canStartDrawerEdgeOpen,
  canStartDrawerInnerClose,
  canStartDrawerShellClose,
} from "./gesture-guards.js";
import { createHorizontalDragGesture } from "./horizontal-drag.js";
import { evaluateSwipeRelease } from "./swipe-release.js";

function shouldReleaseBySwipe(dx, velocity, direction) {
  return evaluateSwipeRelease({
    distance: dx * direction,
    velocity,
    direction,
  });
}

// ── 边缘左滑打开 ──

createHorizontalDragGesture(appShell, {
  targetEl: drawer,
  getClosedPx: getDrawerClosedPx,
  getBasePx: getDrawerClosedPx,
  useNonlinearMotion: true,
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
  getClosedPx: getDrawerClosedPx,
  useNonlinearMotion: true,
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
  getClosedPx: getDrawerClosedPx,
  useNonlinearMotion: true,
  traceLabel: "drawer.shellClose",
  shouldStart: canStartDrawerShellClose,
  getReleaseTargetPx: ({ dx, velocity, closedPx }) => shouldReleaseBySwipe(dx, velocity, -1) ? closedPx : 0,
  onRelease: (dx, wasDragging, velocity) => {
    if (shouldReleaseBySwipe(dx, velocity, -1)) closeDrawer({ withTransitionLock: false });
  },
});
