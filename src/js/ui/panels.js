import { closeScoreSheet } from "../score-sheet/index.js";
import { addButton, newAssignmentPanel, newAssignmentTitleInput, newAssignmentSubjectInput, quickPanel, quickRenameInput } from "../dom-refs.js";
import { closeConfirm } from "./confirm.js";
import { closeDrawer } from "./drawer.js";
import { refreshQuickPanelContent } from "../render/quickPanel.js";
import { makeDefaultAssignmentTitle } from "../utils/id.js";
import { resetQuickPanelView, restoreQuickPanelViewFromPreference, shouldShowQuickPanelHistoryContent } from "./history.js";
import { beginShadowRevealAfterOpen, cancelShadowReveal } from "./shadow-reveal.js";
import {
  isCrossPanelOpenBlocked,
} from "../gestures/motion-registry.js";
import {
  nextExplicitMotionGeneration,
  prepareExplicitOpenTransform,
  runExplicitOpenAnimation,
  runExplicitCloseAnimation,
} from "../gestures/explicit-open-motion.js";
import { clearExplicitMotionStyles } from "../gestures/pointer-drag-lifecycle.js";
import { endQuickPanelPullPreview } from "../gestures/layer-motion-state.js";

let abortQuickPanelOpenDrag = () => {};
let pendingNewAssignmentFocusFrame = 0;

export function registerQuickPanelOpenDragAbort(fn) {
  abortQuickPanelOpenDrag = fn;
}

function cancelPendingNewAssignmentFocus() {
  if (!pendingNewAssignmentFocusFrame) return;
  cancelAnimationFrame(pendingNewAssignmentFocusFrame);
  pendingNewAssignmentFocusFrame = 0;
}

function scheduleNewAssignmentFocus() {
  cancelPendingNewAssignmentFocus();
  pendingNewAssignmentFocusFrame = requestAnimationFrame(() => {
    pendingNewAssignmentFocusFrame = 0;
    if (!newAssignmentPanel.classList.contains("is-open")) return;
    newAssignmentTitleInput.focus();
  });
}

function teardownQuickPanelDrag() {
  abortQuickPanelOpenDrag();
  endQuickPanelPullPreview();
}

export function openNewAssignmentPanel() {
  if (isCrossPanelOpenBlocked()) return;
  closeDrawer({ withTransitionLock: false });
  closeFloatingPanels({ restoreFocus: false, animate: false });

  quickPanel.classList.remove("is-open");
  quickPanel.setAttribute("aria-hidden", "true");

  newAssignmentTitleInput.value = makeDefaultAssignmentTitle();
  if (newAssignmentSubjectInput) newAssignmentSubjectInput.value = "英语";
  beginTopSheetExplicitMotion(newAssignmentPanel);
  newAssignmentPanel.classList.add("is-open");
  newAssignmentPanel.setAttribute("aria-hidden", "false");
  animateTopSheetOpen(newAssignmentPanel, {
    shadowOnSettled: () => {
      scheduleNewAssignmentFocus();
    },
  });
}

function blurTopSheetFocus() {
  const active = document.activeElement;
  if (active && (newAssignmentPanel.contains(active) || quickPanel.contains(active))) {
    active.blur();
  }
}

function closedTopSheetDelta(panel) {
  return -panel.offsetHeight;
}

function beginTopSheetExplicitMotion(panel) {
  prepareExplicitOpenTransform(panel, "y", closedTopSheetDelta(panel));
}

function animateTopSheetOpen(panel, { onSettled, shadowOnSettled } = {}) {
  const fromDelta = closedTopSheetDelta(panel);
  const generation = nextExplicitMotionGeneration(panel);
  runExplicitOpenAnimation({
    el: panel,
    axis: "y",
    fromPx: fromDelta,
    generation,
    onMotionStarted: (anim) => {
      beginShadowRevealAfterOpen(panel, {
        onSettled: shadowOnSettled,
        motionFinished: anim.finished,
      });
    },
    onComplete: onSettled,
  });
}

function animateTopSheetClose(panel, onClosed) {
  const generation = nextExplicitMotionGeneration(panel);
  runExplicitCloseAnimation({
    el: panel,
    axis: "y",
    toPx: closedTopSheetDelta(panel),
    generation,
    onComplete: () => {
      panel.classList.remove("is-open");
      panel.setAttribute("aria-hidden", "true");
      onClosed?.();
    },
  });
}

export function closeFloatingPanels({ restoreFocus = true, animate = true } = {}) {
  const wasNewAssignmentPanelOpen = newAssignmentPanel.classList.contains("is-open");
  const shouldAnimateQuickPanel = animate && quickPanel.classList.contains("is-open");
  const shouldAnimateNewAssignmentPanel = animate && newAssignmentPanel.classList.contains("is-open");

  cancelPendingNewAssignmentFocus();
  blurTopSheetFocus();
  closeScoreSheet();
  teardownQuickPanelDrag();
  resetQuickPanelView();
  cancelShadowReveal(quickPanel);
  cancelShadowReveal(newAssignmentPanel);

  if (shouldAnimateQuickPanel) {
    animateTopSheetClose(quickPanel);
  } else {
    nextExplicitMotionGeneration(quickPanel);
    quickPanel.classList.remove("is-open");
    quickPanel.setAttribute("aria-hidden", "true");
    clearExplicitMotionStyles(quickPanel);
  }

  if (shouldAnimateNewAssignmentPanel) {
    animateTopSheetClose(newAssignmentPanel);
  } else {
    nextExplicitMotionGeneration(newAssignmentPanel);
    newAssignmentPanel.classList.remove("is-open");
    newAssignmentPanel.setAttribute("aria-hidden", "true");
    clearExplicitMotionStyles(newAssignmentPanel);
  }

  closeConfirm();

  if (restoreFocus && wasNewAssignmentPanelOpen) {
    requestAnimationFrame(() => addButton.focus());
  }
}

export function openQuickPanel({ focusName = false } = {}) {
  if (isCrossPanelOpenBlocked()) return;
  closeDrawer({ withTransitionLock: false });
  closeFloatingPanels({ restoreFocus: false, animate: false });
  restoreQuickPanelViewFromPreference();
  refreshQuickPanelContent(shouldShowQuickPanelHistoryContent());

  beginTopSheetExplicitMotion(quickPanel);
  quickPanel.classList.add("is-open");
  quickPanel.setAttribute("aria-hidden", "false");
  animateTopSheetOpen(quickPanel);

  if (focusName) {
    requestAnimationFrame(() => quickRenameInput?.focus());
  }
}

export function commitQuickPanelOpen() {
  quickPanel.classList.add("is-open");
  quickPanel.setAttribute("aria-hidden", "false");
}
