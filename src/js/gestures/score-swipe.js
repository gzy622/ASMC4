import { appShell, scoreSheet } from "../dom-refs.js";
import { closeScoreSheet } from "../score-sheet/index.js";
import { createVerticalDragGesture } from "./drag-gesture.js";
import { canStartScoreSheetInnerClose, canStartScoreSheetShellClose } from "./gesture-guards.js";
import { isUiTransitionBusy } from "../runtime.js";

createVerticalDragGesture(scoreSheet, {
  closeDirection: +1,
  onClose: closeScoreSheet,
  busyKey: "sheet",
  traceLabel: "scoreSheet.close",
  shouldStart: event => canStartScoreSheetInnerClose(event, isUiTransitionBusy("sheet")),
});

createVerticalDragGesture(appShell, {
  closeDirection: +1,
  targetEl: scoreSheet,
  busyKey: "sheet",
  traceLabel: "scoreSheet.close.shell",
  shouldStart: event => canStartScoreSheetShellClose(event, isUiTransitionBusy("sheet")),
  onClose: closeScoreSheet,
});
