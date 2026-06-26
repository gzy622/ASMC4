import {
  confirmPanel,
  drawer,
  modalScrim,
  newAssignmentPanel,
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

function panelScrimProgress(delta, height) {
  return height > 0 ? 1 - Math.abs(delta) / height : 0;
}

function topSheetProgress(delta, minDelta) {
  const range = -minDelta;
  return range > 0 ? (delta - minDelta) / range : 0;
}

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
  modalScrim.classList.remove("is-open");
  modalScrim.style.opacity = "";
}

function finishTopSheetOpen() {
  commitQuickPanelOpen();
  quickPanel.classList.remove("is-dragging");
}

function canDragPanelFromScrim(panel) {
  return (event) => (
    event.target === modalScrim
    && panel.classList.contains("is-open")
    && !confirmPanel.classList.contains("is-open")
  );
}

function bindTopSheetCloseGesture(panel) {
  createVerticalDragGesture(panel, {
    closeDirection: -1,
    onClose: closeAllCenterPanels,
    onProgress: (progress) => {
      modalScrim.style.opacity = progress;
    },
    getReleaseSecondary: ({ delta, targetDelta }) => ({
      el: modalScrim,
      prop: "opacity",
      fromValue: panelScrimProgress(delta, panel.offsetHeight),
      toValue: panelScrimProgress(targetDelta, panel.offsetHeight),
    }),
  });

  createVerticalDragGesture(modalScrim, {
    closeDirection: -1,
    targetEl: panel,
    shouldStart: canDragPanelFromScrim(panel),
    onClose: closeAllCenterPanels,
    onProgress: (progress) => {
      modalScrim.style.opacity = progress;
    },
    getReleaseSecondary: ({ delta, targetDelta }) => ({
      el: modalScrim,
      prop: "opacity",
      fromValue: panelScrimProgress(delta, panel.offsetHeight),
      toValue: panelScrimProgress(targetDelta, panel.offsetHeight),
    }),
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
    modalScrim.classList.add("is-open");
    modalScrim.style.opacity = 0;
  },
  onProgress: (progress) => {
    modalScrim.style.opacity = progress;
  },
  getReleaseSecondary: ({ delta, minDelta, targetDelta }) => ({
    el: modalScrim,
    prop: "opacity",
    fromValue: topSheetProgress(delta, minDelta),
    toValue: topSheetProgress(targetDelta, minDelta),
  }),
  onOpen: finishTopSheetOpen,
  onCancel: cancelTopSheetOpen,
  keepSecondaryOnOpen: true,
});

bindTopSheetCloseGesture(quickPanel);
bindTopSheetCloseGesture(newAssignmentPanel);
