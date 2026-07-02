import { confirmPanel, phoneEl, scoreSheet } from "../dom-refs.js";
import { closeScoreSheet } from "../score-sheet/index.js";
import { createVerticalDragGesture } from "./drag-gesture.js";
import { uiTransitionBusy } from "../runtime.js";

createVerticalDragGesture(scoreSheet, {
  closeDirection: +1,
  onClose: closeScoreSheet,
});

createVerticalDragGesture(phoneEl, {
  closeDirection: +1,
  targetEl: scoreSheet,
  shouldStart: (event) => {
    if (uiTransitionBusy) return false;
    if (confirmPanel.classList.contains("is-open")) return false;
    if (!scoreSheet.classList.contains("is-open")) return false;
    return !event.target.closest(".score-sheet, .top-sheet, .modal-panel, .fullscreen-panel, .drawer, .nav-button, .icon-button, .title-wrap");
  },
  onClose: closeScoreSheet,
});
