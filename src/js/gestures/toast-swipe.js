import { appToast } from "../dom-refs.js";
import { hideToast } from "../utils/dom.js";
import { createVerticalDragGesture } from "./drag-gesture.js";

const TOAST_DISMISS_THRESHOLD = 48;

createVerticalDragGesture(appToast, {
  closeDirection: 1,
  threshold: TOAST_DISMISS_THRESHOLD,
  shouldStart: () => appToast.classList.contains("is-visible") && !appToast.hidden,
  onClose: hideToast,
});
