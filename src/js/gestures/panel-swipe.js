import {
  appShell,
  newAssignmentPanel,
  quickPanel,
  scrollContainer,
} from "../dom-refs.js";
import { refreshQuickPanelContent } from "../render/quickPanel.js";
import { restoreQuickPanelViewFromPreference, shouldShowQuickPanelHistoryContent } from "../ui/history.js";
import { newAssignmentPanelController, quickPanelController } from "../ui/panels.js";
import { clearAllLongPressTimers, setLongPressTriggered } from "../runtime.js";
import {
  beginQuickPanelPullPreview,
  endQuickPanelPullPreview,
} from "./layer-motion-state.js";
import {
  FORM_CONTROL_SELECTOR,
  canQuickPanelPullAtScrollTop,
  canStartQuickPanelInnerClose,
  canStartQuickPanelPullOpen,
  canStartQuickPanelShellClose,
  canStartTopSheetInnerClose,
  canStartTopSheetShellClose,
  isTouchOn,
} from "./gesture-guards.js";
import { bindInteractiveLayerGesture } from "./interactive-layer-controller.js";
import { evaluateSwipeRelease } from "./swipe-release.js";
import { FLING_VELOCITY_THRESHOLD, MIN_FLING_DISTANCE } from "./constants.js";

function decideVerticalTarget({ delta, currentPx, closedPx, velocity, startedFromClosed, wasHeld }) {
  if (startedFromClosed) {
    return evaluateSwipeRelease({ distance: Math.max(0, delta), velocity, direction: +1 }) ? "open" : "closed";
  }
  if (!wasHeld) {
    return evaluateSwipeRelease({ distance: Math.max(0, -delta), velocity, direction: -1 }) ? "closed" : "open";
  }
  if (Math.abs(delta) >= MIN_FLING_DISTANCE && Math.abs(velocity) >= FLING_VELOCITY_THRESHOLD) {
    return velocity > 0 ? "open" : "closed";
  }
  return Math.abs(currentPx) <= Math.abs(currentPx - closedPx) ? "open" : "closed";
}

function canStartQuickGesture(event, controller) {
  if (isTouchOn(event.target, FORM_CONTROL_SELECTOR) && !quickPanel.contains(event.target)) return false;
  if (controller.isAnimating) return true;
  if (controller.phase === "closed") {
    return scrollContainer.contains(event.target)
      && canStartQuickPanelPullOpen(event)
      && canQuickPanelPullAtScrollTop(scrollContainer.scrollTop);
  }
  if (quickPanel.contains(event.target)) return canStartQuickPanelInnerClose(event);
  return canStartQuickPanelShellClose(event);
}

bindInteractiveLayerGesture(appShell, quickPanelController, {
  axis: "y",
  canStartFromClosed: true,
  shouldStart: canStartQuickGesture,
  onPrepareClosed() {
    restoreQuickPanelViewFromPreference();
    refreshQuickPanelContent(shouldShowQuickPanelHistoryContent());
    beginQuickPanelPullPreview();
  },
  onCancelClosed: endQuickPanelPullPreview,
  onDragStart() {
    clearAllLongPressTimers();
    setLongPressTriggered(false);
  },
  decideTarget: decideVerticalTarget,
  traceLabel: "quickPanel.gesture",
});

function canStartNewAssignmentGesture(event, controller) {
  if (isTouchOn(event.target, FORM_CONTROL_SELECTOR) && !newAssignmentPanel.contains(event.target)) return false;
  if (controller.isAnimating) return true;
  if (controller.phase !== "open") return false;
  if (newAssignmentPanel.contains(event.target)) return canStartTopSheetInnerClose(newAssignmentPanel);
  return canStartTopSheetShellClose(newAssignmentPanel, event);
}

bindInteractiveLayerGesture(appShell, newAssignmentPanelController, {
  axis: "y",
  shouldStart: canStartNewAssignmentGesture,
  decideTarget: decideVerticalTarget,
  traceLabel: "newAssignment.gesture",
});
