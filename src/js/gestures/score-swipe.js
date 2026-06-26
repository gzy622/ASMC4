import { scoreSheet, scoreSheetScrim } from "../dom-refs.js";
import { closeScoreSheet } from "../score-sheet/index.js";
import { createVerticalDragGesture } from "./drag-gesture.js";

function scoreScrimProgress(delta, height) {
  return height > 0 ? 1 - Math.abs(delta) / height : 0;
}

createVerticalDragGesture(scoreSheet, {
  closeDirection: +1,
  onClose: closeScoreSheet,
  onProgress: (progress) => {
    scoreSheetScrim.style.opacity = progress;
  },
  getReleaseSecondary: ({ delta, targetDelta }) => ({
    el: scoreSheetScrim,
    prop: "opacity",
    fromValue: scoreScrimProgress(delta, scoreSheet.offsetHeight),
    toValue: scoreScrimProgress(targetDelta, scoreSheet.offsetHeight),
  }),
});
