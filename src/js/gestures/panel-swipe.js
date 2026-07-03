import {
  confirmPanel,
  drawer,
  newAssignmentPanel,
  phoneEl,
  quickPanel,
  rosterEditorPanel,
  scoreSheet,
  scrollContainer,
  settingsPanel
} from "../dom-refs.js";
import { renderHistoryList } from "../render/history.js";
import { renderQuickPanel } from "../render/quickPanel.js";
import { uiTransitionBusy, setUiTransitionBusy } from "../runtime.js";
import { isHistoryViewActive } from "../ui/history.js";
import { closeFloatingPanels, commitQuickPanelOpen } from "../ui/panels.js";
import { createTopSheetOpenGesture, createVerticalDragGesture } from "./drag-gesture.js";

function anyFloatingLayerOpen() {
  return (
    drawer.classList.contains("is-open")
    || quickPanel.classList.contains("is-open")
    || newAssignmentPanel.classList.contains("is-open")
    || scoreSheet.classList.contains("is-open")
    || confirmPanel.classList.contains("is-open")
    || rosterEditorPanel.classList.contains("is-open")
    || settingsPanel.classList.contains("is-open")
  );
}

function blocksQuickPanelPull() {
  return anyFloatingLayerOpen() || quickPanel.classList.contains("is-dragging");
}

function gesturesLocked() {
  return uiTransitionBusy && blocksQuickPanelPull();
}

function canPullQuickPanel() {
  return !anyFloatingLayerOpen() && scrollContainer.scrollTop <= 1;
}

function cancelTopSheetOpen() {
  quickPanel.classList.remove("is-dragging");
}

function finishTopSheetOpen() {
  commitQuickPanelOpen();
  quickPanel.classList.remove("is-dragging");
}

function bindTopSheetCloseGesture(panel) {
  createVerticalDragGesture(panel, {
    closeDirection: -1,
    onClose: closeFloatingPanels,
  });

  createVerticalDragGesture(phoneEl, {
    closeDirection: -1,
    targetEl: panel,
    shouldStart: (event) => {
      if (uiTransitionBusy) return false;
      if (confirmPanel.classList.contains("is-open")) return false;
      if (!panel.classList.contains("is-open")) return false;
      return !event.target.closest(".top-sheet, .modal-panel, .fullscreen-panel, .drawer, .score-sheet, .nav-button, .icon-button, .title-wrap");
    },
    onClose: closeFloatingPanels,
  });
}

function bindQuickPanelCloseGesture(abortQuickPanelOpenRelease) {
  function prepareQuickPanelCloseDrag() {
    abortQuickPanelOpenRelease();
    if (!quickPanel.classList.contains("is-open")) {
      commitQuickPanelOpen();
    }
    quickPanel.classList.remove("is-dragging");
    setUiTransitionBusy(false);
  }

  const closeOpts = {
    closeDirection: -1,
    targetEl: quickPanel,
    onClose: closeFloatingPanels,
    onDragStart: prepareQuickPanelCloseDrag,
  };

  const panelHead = quickPanel.querySelector(".panel-head");
  const handleZone = quickPanel.querySelector(".top-sheet-handle-zone");
  const actionGrid = quickPanel.querySelector(".quick-action-grid");

  if (panelHead) {
    createVerticalDragGesture(panelHead, {
      ...closeOpts,
      shouldStart: event => quickPanel.classList.contains("is-open")
        && !event.target.closest(".panel-close"),
    });
  }
  if (handleZone) {
    createVerticalDragGesture(handleZone, {
      ...closeOpts,
      shouldStart: () => quickPanel.classList.contains("is-open"),
    });
  }
  if (actionGrid) {
    createVerticalDragGesture(actionGrid, {
      ...closeOpts,
      shouldStart: () => quickPanel.classList.contains("is-open"),
    });
  }

  createVerticalDragGesture(phoneEl, {
    closeDirection: -1,
    targetEl: quickPanel,
    onDragStart: prepareQuickPanelCloseDrag,
    shouldStart: (event) => {
      if (confirmPanel.classList.contains("is-open")) return false;
      if (!quickPanel.classList.contains("is-open")) return false;
      if (event.target.closest("#quickPanel")) return false;
      if (event.target.closest(".drawer, .score-sheet, .fullscreen-panel, .nav-button, .icon-button, .title-wrap")) {
        return false;
      }
      return !event.target.closest("#newAssignmentPanel, #confirmPanel, #rosterEditorPanel, #settingsPanel");
    },
    onClose: closeFloatingPanels,
  });
}

const quickPanelOpenGesture = createTopSheetOpenGesture(scrollContainer, {
  sheetEl: quickPanel,
  canStart: (event) => {
    if (gesturesLocked()) return false;
    if (blocksQuickPanelPull()) return false;
    return !event.target.closest("button:not(.student-card), input, select, textarea");
  },
  canPull: canPullQuickPanel,
  onPrepare: () => {
    if (isHistoryViewActive()) {
      renderHistoryList();
    } else {
      renderQuickPanel();
    }
    quickPanel.classList.add("is-dragging");
  },
  onOpen: finishTopSheetOpen,
  onCancel: cancelTopSheetOpen,
});

bindQuickPanelCloseGesture(quickPanelOpenGesture.abortRelease);
bindTopSheetCloseGesture(newAssignmentPanel);
