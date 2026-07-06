import {
  confirmScrim,
  scoreSheet,
  rosterEditorPanel,
  settingsPanel,
  quickPanel,
  newAssignmentPanel,
  drawer,
} from "../dom-refs.js";

const releaseAnimatingTargets = new WeakMap();
const explicitOpenAnimatingTargets = new WeakSet();

const GESTURE_LAYER_ELS = [
  confirmScrim,
  scoreSheet,
  rosterEditorPanel,
  settingsPanel,
  quickPanel,
  newAssignmentPanel,
  drawer,
];

const MOTION_DRAGGING_CLASS = "is-motion-dragging";

export function beginTargetReleaseAnimation(targetEl, direction = "close") {
  if (targetEl) releaseAnimatingTargets.set(targetEl, direction);
}

export function endTargetReleaseAnimation(targetEl) {
  if (targetEl) releaseAnimatingTargets.delete(targetEl);
}

export function isTargetReleaseAnimating(targetEl) {
  return targetEl != null && releaseAnimatingTargets.has(targetEl);
}

export function isTargetOpenReleaseAnimating(targetEl) {
  return releaseAnimatingTargets.get(targetEl) === "open";
}

export function beginTargetExplicitOpenAnimation(targetEl) {
  if (targetEl) explicitOpenAnimatingTargets.add(targetEl);
}

export function endTargetExplicitOpenAnimation(targetEl) {
  if (targetEl) explicitOpenAnimatingTargets.delete(targetEl);
}

export function isTargetExplicitOpenAnimating(targetEl) {
  return targetEl != null && explicitOpenAnimatingTargets.has(targetEl);
}

export function isLayerOpeningAnimating(el) {
  if (!el) return false;
  if (isTargetOpenReleaseAnimating(el)) return true;
  if (isTargetExplicitOpenAnimating(el)) return true;
  if (el === quickPanel && el.classList.contains("is-dragging")) return true;
  if (el === drawer && !el.classList.contains("is-open") && el.classList.contains(MOTION_DRAGGING_CLASS) && !isTargetReleaseAnimating(el)) {
    return true;
  }
  return false;
}

export function isCrossPanelOpenBlocked() {
  return GESTURE_LAYER_ELS.some(el => isLayerOpeningAnimating(el));
}

/** 打开动画中或静止 `is-open`（收起释放中除外）→ 会挡住其它打开手势 */
export function isLayerOpenForGestureBlock(el) {
  return isLayerOpeningAnimating(el)
    || (el?.classList.contains("is-open") && !isTargetReleaseAnimating(el));
}
