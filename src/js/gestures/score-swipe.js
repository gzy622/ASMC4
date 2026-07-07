import { appShell, scoreSheet } from "../dom-refs.js";
import { closeScoreSheet } from "../score-sheet/index.js";
import { SCORE_SHEET_MOTION_DURATION_SCALE } from "./constants.js";
import { createVerticalDragGesture } from "./drag-gesture.js";
import { canStartScoreSheetInnerClose, canStartScoreSheetShellClose } from "./gesture-guards.js";
import { isUiTransitionBusy } from "../runtime.js";

createVerticalDragGesture(scoreSheet, {
  closeDirection: +1,
  onClose: () => closeScoreSheet({ fromGesture: true }),
  busyKey: "sheet",
  traceLabel: "scoreSheet.close",
  durationScale: SCORE_SHEET_MOTION_DURATION_SCALE,
  shouldStart: event => canStartScoreSheetInnerClose(event, isUiTransitionBusy("sheet")),
});

createVerticalDragGesture(appShell, {
  closeDirection: +1,
  targetEl: scoreSheet,
  busyKey: "sheet",
  traceLabel: "scoreSheet.close.shell",
  durationScale: SCORE_SHEET_MOTION_DURATION_SCALE,
  shouldStart: event => canStartScoreSheetShellClose(event, isUiTransitionBusy("sheet")),
  onClose: () => closeScoreSheet({ fromGesture: true }),
});
