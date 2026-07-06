import {
  confirmPanel,
  appShell,
  quickPanel,
  newAssignmentPanel,
  scrollContainer
} from "../dom-refs.js";
import { refreshQuickPanelContent } from "../render/quickPanel.js";
import { setUiTransitionBusy } from "../runtime.js";
import { restoreQuickPanelViewFromPreference, shouldShowQuickPanelHistoryContent } from "../ui/history.js";
import { FLOATING_LAYER_ELS } from "../ui/floating-layers.js";
import { closeFloatingPanels, commitQuickPanelOpen, registerQuickPanelOpenDragAbort } from "../ui/panels.js";
import { isLayerOpenForGestureBlock, isTargetReleaseAnimating } from "./motion-registry.js";
import {
  beginQuickPanelPullPreview,
  endQuickPanelPullPreview,
  isQuickPanelPullPreview,
} from "./layer-motion-state.js";
import { createTopSheetOpenGesture, createVerticalDragGesture } from "./drag-gesture.js";

function blocksQuickPanelPull() {
  if (isQuickPanelPullPreview()) return true;
  if (isTargetReleaseAnimating(quickPanel)) return true;
  return FLOATING_LAYER_ELS.some(el => isLayerOpenForGestureBlock(el));
}

function canPullQuickPanel() {
  if (isTargetReleaseAnimating(quickPanel)) return false;
  return !FLOATING_LAYER_ELS.some(el => isLayerOpenForGestureBlock(el)) && scrollContainer.scrollTop <= 1;
}

function cancelTopSheetOpen() {
  endQuickPanelPullPreview();
}

function finishTopSheetOpen() {
  commitQuickPanelOpen();
  endQuickPanelPullPreview();
}

function bindTopSheetCloseGesture(panel) {
  createVerticalDragGesture(panel, {
    closeDirection: -1,
    onClose: closeFloatingPanels,
    shouldStart: () => !isTargetReleaseAnimating(panel),
    busyKey: "panel",
    traceLabel: "newAssignment.close",
  });

  createVerticalDragGesture(appShell, {
    closeDirection: -1,
    targetEl: panel,
    shouldStart: (event) => {
      if (isTargetReleaseAnimating(panel)) return false;
      if (confirmPanel.classList.contains("is-open")) return false;
      if (!panel.classList.contains("is-open")) return false;
      return !event.target.closest(".top-sheet, .modal-panel, .fullscreen-panel, .drawer, .score-sheet, .nav-button, .icon-button, .title-wrap");
    },
    onClose: closeFloatingPanels,
    busyKey: "panel",
    traceLabel: "newAssignment.close.shell",
  });
}

function bindQuickPanelCloseGesture(abortQuickPanelOpenRelease) {
  function prepareQuickPanelCloseDrag() {
    abortQuickPanelOpenRelease();
    if (!quickPanel.classList.contains("is-open")) {
      commitQuickPanelOpen();
    }
    endQuickPanelPullPreview();
    setUiTransitionBusy(false, "panel");
  }

  const closeOpts = {
    closeDirection: -1,
    targetEl: quickPanel,
    onClose: closeFloatingPanels,
    onDragStart: prepareQuickPanelCloseDrag,
    busyKey: "panel",
  };

  createVerticalDragGesture(quickPanel, {
    ...closeOpts,
    shouldStart: event => quickPanel.classList.contains("is-open")
      && !isTargetReleaseAnimating(quickPanel)
      && !event.target.closest("#quickPanelHistoryView"),
    traceLabel: "quickPanel.close",
  });

  createVerticalDragGesture(appShell, {
    closeDirection: -1,
    targetEl: quickPanel,
    onDragStart: prepareQuickPanelCloseDrag,
    shouldStart: (event) => {
      if (isTargetReleaseAnimating(quickPanel)) return false;
      if (confirmPanel.classList.contains("is-open")) return false;
      if (!quickPanel.classList.contains("is-open")) return false;
      if (event.target.closest("#quickPanel")) return false;
      if (event.target.closest(".drawer, .score-sheet, .fullscreen-panel, .nav-button, .icon-button, .title-wrap")) {
        return false;
      }
      return !event.target.closest("#newAssignmentPanel, #confirmPanel, #rosterEditorPanel, #settingsPanel");
    },
    onClose: closeFloatingPanels,
    busyKey: "panel",
    traceLabel: "quickPanel.close.shell",
  });
}

const quickPanelOpenGesture = createTopSheetOpenGesture(scrollContainer, {
  sheetEl: quickPanel,
  canStart: (event) => {
    if (isTargetReleaseAnimating(quickPanel)) return false;
    if (blocksQuickPanelPull()) return false;
    return !event.target.closest("button:not(.student-card), input, select, textarea");
  },
  canPull: canPullQuickPanel,
  onPrepare: () => {
    restoreQuickPanelViewFromPreference();
    refreshQuickPanelContent(shouldShowQuickPanelHistoryContent());
    beginQuickPanelPullPreview();
  },
  onOpen: finishTopSheetOpen,
  onCancel: cancelTopSheetOpen,
  busyKey: "panel",
  traceLabel: "quickPanel.pullOpen",
});

bindQuickPanelCloseGesture(quickPanelOpenGesture.abortRelease);
registerQuickPanelOpenDragAbort(() => {
  quickPanelOpenGesture.abortRelease();
  cancelTopSheetOpen();
});
bindTopSheetCloseGesture(newAssignmentPanel);
