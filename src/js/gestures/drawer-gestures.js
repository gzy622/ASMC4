import { appShell, drawer } from "../dom-refs.js";
import { drawerController } from "../ui/drawer.js";
import { clearAllLongPressTimers, setLongPressTriggered } from "../runtime.js";
import {
  canStartDrawerEdgeOpen,
  canStartDrawerInnerClose,
  canStartDrawerShellClose,
  FORM_CONTROL_SELECTOR,
  isTouchOn,
} from "./gesture-guards.js";
import { bindInteractiveLayerGesture } from "./interactive-layer-controller.js";
import { evaluateSwipeRelease } from "./swipe-release.js";
import { FLING_VELOCITY_THRESHOLD, MIN_FLING_DISTANCE } from "./constants.js";

function decideDrawerTarget({ delta, currentPx, closedPx, velocity, startedFromClosed, wasHeld }) {
  if (startedFromClosed) {
    return evaluateSwipeRelease({ distance: Math.max(0, delta), velocity, direction: +1 }) ? "open" : "closed";
  }
  if (!wasHeld) {
    return evaluateSwipeRelease({ distance: Math.max(0, -delta), velocity, direction: -1 }) ? "closed" : "open";
  }
  if (Math.abs(delta) >= MIN_FLING_DISTANCE && Math.abs(velocity) >= FLING_VELOCITY_THRESHOLD) {
    return velocity > 0 ? "open" : "closed";
  }
  const openPx = drawerController.getOpenPx();
  return Math.abs(currentPx - openPx) <= Math.abs(currentPx - closedPx) ? "open" : "closed";
}

function canStartDrawerGesture(event, controller) {
  if (isTouchOn(event.target, FORM_CONTROL_SELECTOR)) return false;
  if (controller.isAnimating) return true;
  if (controller.phase === "closed") return canStartDrawerEdgeOpen(event);
  if (drawer.contains(event.target)) return canStartDrawerInnerClose(event);
  return canStartDrawerShellClose(event);
}

bindInteractiveLayerGesture(appShell, drawerController, {
  axis: "x",
  canStartFromClosed: true,
  shouldStart: canStartDrawerGesture,
  onDragStart: () => {
    clearAllLongPressTimers();
    setLongPressTriggered(false);
  },
  decideTarget: decideDrawerTarget,
  traceLabel: "drawer.gesture",
});
