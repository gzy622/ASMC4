import { closeScoreSheet } from "../score-sheet/index.js";
import { addButton, newAssignmentPanel, newAssignmentTitleInput, newAssignmentSubjectInput, quickPanel, quickRenameInput } from "../dom-refs.js";
import { closeConfirm } from "./confirm.js";
import { closeDrawer } from "./drawer.js";
import { refreshQuickPanelContent } from "../render/quickPanel.js";
import { makeDefaultAssignmentTitle } from "../utils/id.js";
import { resetQuickPanelView, restoreQuickPanelViewFromPreference, shouldShowQuickPanelHistoryContent } from "./history.js";
import { beginShadowRevealAfterOpen, cancelShadowReveal, settleShadowRevealAfterOpen } from "./shadow-reveal.js";
import {
  beginTargetReleaseAnimation,
  endTargetReleaseAnimation,
  isCrossPanelOpenBlocked,
} from "../gestures/motion-registry.js";
import { animateMotionRelease } from "../gestures/gesture-motion-engine.js";
import { endQuickPanelPullPreview } from "../gestures/layer-motion-state.js";

let abortQuickPanelOpenDrag = () => {};
const panelMotionGenerations = new WeakMap();
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
  beginShadowRevealAfterOpen(newAssignmentPanel, {
    onSettled: () => {
      scheduleNewAssignmentFocus();
    },
  });
  animateTopSheetOpen(newAssignmentPanel);
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

function clearTopSheetMotionStyles(panel) {
  panel.style.transition = "none";
  panel.style.transform = "";
  panel.style.willChange = "";
  void panel.offsetHeight;
  panel.style.transition = "";
}

function beginTopSheetExplicitMotion(panel) {
  const fromDelta = closedTopSheetDelta(panel);
  panel.classList.add("no-anim");
  panel.style.transform = `translateY(${fromDelta}px)`;
  return fromDelta;
}

function endTopSheetExplicitMotion(panel) {
  clearTopSheetMotionStyles(panel);
  panel.classList.remove("no-anim");
  void panel.offsetHeight;
}

function nextPanelMotionGeneration(panel) {
  const generation = (panelMotionGenerations.get(panel) || 0) + 1;
  panelMotionGenerations.set(panel, generation);
  return generation;
}

function currentPanelMotionGeneration(panel) {
  return panelMotionGenerations.get(panel) || 0;
}

function animateTopSheetOpen(panel, { onSettled } = {}) {
  const fromDelta = closedTopSheetDelta(panel);
  const generation = nextPanelMotionGeneration(panel);
  animateMotionRelease(panel, "y", fromDelta, 0, 0).finished.then(() => {
    if (generation !== currentPanelMotionGeneration(panel)) return;
    endTopSheetExplicitMotion(panel);
    settleShadowRevealAfterOpen(panel);
    onSettled?.();
  });
}

function animateTopSheetClose(panel, onClosed) {
  const toDelta = closedTopSheetDelta(panel);
  const generation = nextPanelMotionGeneration(panel);
  panel.classList.add("no-anim");
  beginTargetReleaseAnimation(panel, "close");
  panel.style.transform = "translateY(0)";
  animateMotionRelease(panel, "y", 0, toDelta, 0).finished.then(() => {
    if (generation !== currentPanelMotionGeneration(panel)) return;
    panel.classList.remove("is-open");
    panel.setAttribute("aria-hidden", "true");
    endTargetReleaseAnimation(panel);
    endTopSheetExplicitMotion(panel);
    onClosed?.();
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
    nextPanelMotionGeneration(quickPanel);
    quickPanel.classList.remove("is-open");
    quickPanel.setAttribute("aria-hidden", "true");
    clearTopSheetMotionStyles(quickPanel);
  }

  if (shouldAnimateNewAssignmentPanel) {
    animateTopSheetClose(newAssignmentPanel);
  } else {
    nextPanelMotionGeneration(newAssignmentPanel);
    newAssignmentPanel.classList.remove("is-open");
    newAssignmentPanel.setAttribute("aria-hidden", "true");
    clearTopSheetMotionStyles(newAssignmentPanel);
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
  beginShadowRevealAfterOpen(quickPanel);
  animateTopSheetOpen(quickPanel);

  if (focusName) {
    requestAnimationFrame(() => quickRenameInput?.focus());
  }
}

export function commitQuickPanelOpen() {
  quickPanel.classList.add("is-open");
  quickPanel.setAttribute("aria-hidden", "false");
}
