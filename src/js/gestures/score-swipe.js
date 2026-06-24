import { scoreSheet } from "../dom-refs.js";
import { closeScoreSheet } from "../score-sheet/index.js";
import { createVerticalDragGesture } from "./drag-gesture.js";

createVerticalDragGesture(scoreSheet, { closeDirection: +1, onClose: closeScoreSheet });
