import {
  appShell,
  newAssignmentPanel,
  quickPanel,
  scrollContainer,
} from "../dom-refs.js";
import { refreshQuickPanelContent } from "../render/quickPanel.js";
import { setUiTransitionBusy } from "../runtime.js";
import { restoreQuickPanelViewFromPreference, shouldShowQuickPanelHistoryContent } from "../ui/history.js";
import { closeFloatingPanels, commitQuickPanelOpen, registerQuickPanelOpenDragAbort } from "../ui/panels.js";
import {
  beginQuickPanelPullPreview,
  endQuickPanelPullPreview,
} from "./layer-motion-state.js";
import {
  canQuickPanelPullAtScrollTop,
  canStartQuickPanelInnerClose,
  canStartQuickPanelPullOpen,
  canStartQuickPanelShellClose,
  canStartTopSheetInnerClose,
  canStartTopSheetShellClose,
  isPanelVisuallyOpen,
} from "./gesture-guards.js";
import { createTopSheetOpenGesture, createVerticalDragGesture } from "./drag-gesture.js";

function cancelQuickPanelPullPreview() {
  endQuickPanelPullPreview();
}

function commitQuickPanelPullOpen() {
  commitQuickPanelOpen();
  endQuickPanelPullPreview();
}

function prepareQuickPanelCloseDrag(abortQuickPanelOpenRelease) {
  abortQuickPanelOpenRelease();
  if (!isPanelVisuallyOpen(quickPanel)) {
    commitQuickPanelOpen();
  }
  endQuickPanelPullPreview();
  setUiTransitionBusy(false, "panel");
}

// ── quickPanel 1/2：下拉预览 + 释放打开 ──

const quickPanelOpenGesture = createTopSheetOpenGesture(scrollContainer, {
  sheetEl: quickPanel,
  canStart: canStartQuickPanelPullOpen,
  canPull: () => canQuickPanelPullAtScrollTop(scrollContainer.scrollTop),
  onPrepare: () => {
    restoreQuickPanelViewFromPreference();
    refreshQuickPanelContent(shouldShowQuickPanelHistoryContent());
    beginQuickPanelPullPreview();
  },
  onOpen: commitQuickPanelPullOpen,
  onCancel: cancelQuickPanelPullPreview,
  busyKey: "panel",
  traceLabel: "quickPanel.pullOpen",
});

// ── quickPanel 3：面板内上滑关闭 ──

function bindQuickPanelCloseGesture(abortQuickPanelOpenRelease) {
  const closeOpts = {
    closeDirection: -1,
    targetEl: quickPanel,
    onClose: closeFloatingPanels,
    onDragStart: () => prepareQuickPanelCloseDrag(abortQuickPanelOpenRelease),
    busyKey: "panel",
  };

  createVerticalDragGesture(quickPanel, {
    ...closeOpts,
    shouldStart: canStartQuickPanelInnerClose,
    traceLabel: "quickPanel.close",
  });

  // ── quickPanel 4：面板外上滑关闭 ──

  createVerticalDragGesture(appShell, {
    closeDirection: -1,
    targetEl: quickPanel,
    onDragStart: () => prepareQuickPanelCloseDrag(abortQuickPanelOpenRelease),
    shouldStart: canStartQuickPanelShellClose,
    onClose: closeFloatingPanels,
    busyKey: "panel",
    traceLabel: "quickPanel.close.shell",
  });
}

function bindTopSheetCloseGesture(panel) {
  createVerticalDragGesture(panel, {
    closeDirection: -1,
    onClose: closeFloatingPanels,
    shouldStart: () => canStartTopSheetInnerClose(panel),
    busyKey: "panel",
    traceLabel: "newAssignment.close",
  });

  createVerticalDragGesture(appShell, {
    closeDirection: -1,
    targetEl: panel,
    shouldStart: event => canStartTopSheetShellClose(panel, event),
    onClose: closeFloatingPanels,
    busyKey: "panel",
    traceLabel: "newAssignment.close.shell",
  });
}

bindQuickPanelCloseGesture(quickPanelOpenGesture.abortRelease);
registerQuickPanelOpenDragAbort(() => {
  quickPanelOpenGesture.abortRelease();
  cancelQuickPanelPullPreview();
});
bindTopSheetCloseGesture(newAssignmentPanel);
