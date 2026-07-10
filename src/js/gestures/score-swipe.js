import { appShell, scoreSheet } from "../dom-refs.js";
import { scoreSheetController } from "../score-sheet/index.js";
import {
  FORM_CONTROL_SELECTOR,
  canStartScoreSheetInnerClose,
  canStartScoreSheetShellClose,
  isTouchOn,
} from "./gesture-guards.js";
import { bindInteractiveLayerGesture } from "./interactive-layer-controller.js";
import { evaluateSwipeRelease } from "./swipe-release.js";
import { FLING_VELOCITY_THRESHOLD, MIN_FLING_DISTANCE } from "./constants.js";

function canStartScoreGesture(event, controller) {
  if (isTouchOn(event.target, FORM_CONTROL_SELECTOR) && !scoreSheet.contains(event.target)) return false;
  if (controller.isAnimating) return true;
  if (controller.phase !== "open") return false;
  if (scoreSheet.contains(event.target)) return canStartScoreSheetInnerClose(event, false);
  return canStartScoreSheetShellClose(event, false);
}

function decideScoreTarget({ delta, currentPx, closedPx, velocity, wasHeld }) {
  if (!wasHeld) {
    return evaluateSwipeRelease({ distance: Math.max(0, delta), velocity, direction: +1 }) ? "closed" : "open";
  }
  if (Math.abs(delta) >= MIN_FLING_DISTANCE && Math.abs(velocity) >= FLING_VELOCITY_THRESHOLD) {
    return velocity > 0 ? "closed" : "open";
  }
  return Math.abs(currentPx) <= Math.abs(currentPx - closedPx) ? "open" : "closed";
}

bindInteractiveLayerGesture(appShell, scoreSheetController, {
  axis: "y",
  shouldStart: canStartScoreGesture,
  decideTarget: decideScoreTarget,
  traceLabel: "scoreSheet.gesture",
});
