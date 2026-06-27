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
import { getState } from "../state.js";
import { renderQuickAssignmentList } from "../render/quickPanel.js";
import { overlayTransitionBusy } from "../runtime.js";
import { closeAllCenterPanels, commitQuickPanelOpen } from "../ui/panels.js";
import { createTopSheetOpenGesture, createVerticalDragGesture } from "./drag-gesture.js";

function hasOpenOverlay() {
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
    onClose: closeAllCenterPanels,
  });

  createVerticalDragGesture(phoneEl, {
    closeDirection: -1,
    targetEl: panel,
    shouldStart: (event) => {
      if (overlayTransitionBusy) return false;
      if (confirmPanel.classList.contains("is-open")) return false;
      if (!panel.classList.contains("is-open")) return false;
      return !event.target.closest(".center-panel, .drawer, .score-sheet, .nav-button, .icon-button, .title-wrap");
    },
    onClose: closeAllCenterPanels,
  });
}

createTopSheetOpenGesture(scrollContainer, {
  sheetEl: quickPanel,
  canStart: (event) => {
    if (overlayTransitionBusy) return false;
    if (hasOpenOverlay()) return false;
    return !event.target.closest("button:not(.student-card), input, select, textarea");
  },
  canPull: () => scrollContainer.scrollTop <= 0,
  onPrepare: () => {
    renderQuickAssignmentList(getState());
    quickPanel.classList.add("is-dragging");
  },
  onOpen: finishTopSheetOpen,
  onCancel: cancelTopSheetOpen,
});

bindTopSheetCloseGesture(quickPanel);
bindTopSheetCloseGesture(newAssignmentPanel);
