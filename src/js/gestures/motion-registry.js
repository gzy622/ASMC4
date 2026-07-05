const releaseAnimatingTargets = new WeakSet();

export function beginTargetReleaseAnimation(targetEl) {
  if (targetEl) releaseAnimatingTargets.add(targetEl);
}

export function endTargetReleaseAnimation(targetEl) {
  if (targetEl) releaseAnimatingTargets.delete(targetEl);
}

export function isTargetReleaseAnimating(targetEl) {
  return targetEl != null && releaseAnimatingTargets.has(targetEl);
}

/** `is-open` 且不在收起释放动画中 → 会挡住其它打开手势 */
export function isLayerOpenForGestureBlock(el) {
  return el?.classList.contains("is-open") && !isTargetReleaseAnimating(el);
}
