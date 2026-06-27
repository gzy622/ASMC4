import { confirmPanel, phoneEl, scoreSheet } from "../dom-refs.js";
import { closeScoreSheet } from "../score-sheet/index.js";
import { createVerticalDragGesture } from "./drag-gesture.js";
import { overlayTransitionBusy } from "../runtime.js";

createVerticalDragGesture(scoreSheet, {
  closeDirection: +1,
  onClose: closeScoreSheet,
});

createVerticalDragGesture(phoneEl, {
  closeDirection: +1,
  targetEl: scoreSheet,
  shouldStart: (event) => {
    if (overlayTransitionBusy) return false;
    if (confirmPanel.classList.contains("is-open")) return false;
    if (!scoreSheet.classList.contains("is-open")) return false;
    return !event.target.closest(".score-sheet, .center-panel, .drawer, .nav-button, .icon-button, .title-wrap");
  },
  onClose: closeScoreSheet,
});
