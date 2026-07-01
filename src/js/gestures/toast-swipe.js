import { appToast } from "../dom-refs.js";
import { hideToast, registerToastDismissAbort } from "../utils/dom.js";
import { createVerticalDragGesture } from "./drag-gesture.js";

const TOAST_DISMISS_THRESHOLD = 48;
const TOAST_DISMISS_EXTRA_PX = 24;

function toastDismissDistance(el) {
  return el.offsetHeight + TOAST_DISMISS_EXTRA_PX;
}

const { abortRelease } = createVerticalDragGesture(appToast, {
  closeDirection: 1,
  threshold: TOAST_DISMISS_THRESHOLD,
  shouldStart: () => appToast.classList.contains("is-visible") && !appToast.hidden,
  getCloseTargetPx: toastDismissDistance,
  getReleaseSecondary: ({ targetDelta, delta }) => {
    if (!targetDelta) return null;
    const range = toastDismissDistance(appToast);
    const fromOpacity = range > 0 ? Math.max(0, 1 - Math.abs(delta) / range) : 1;
    return {
      el: appToast,
      prop: "opacity",
      fromValue: String(fromOpacity),
      toValue: "0",
    };
  },
  onClose: hideToast,
});

registerToastDismissAbort(abortRelease);
