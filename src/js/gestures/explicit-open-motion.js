import { setUiTransitionBusy } from "../runtime.js";
import {
  beginTargetReleaseAnimation,
  endTargetReleaseAnimation,
} from "./motion-registry.js";
import { animateMotionRelease } from "./gesture-motion-engine.js";
import { endExplicitMotion } from "./pointer-drag-lifecycle.js";

const generations = new WeakMap();

export function nextExplicitMotionGeneration(el) {
  const gen = (generations.get(el) || 0) + 1;
  generations.set(el, gen);
  return gen;
}

export function isExplicitMotionStale(el, generation) {
  return generation !== (generations.get(el) || 0);
}

export function prepareExplicitOpenTransform(el, axis, fromPx) {
  const translate = axis === "x" ? "translateX" : "translateY";
  el.style.transform = `${translate}(${fromPx}px)`;
}

export function runExplicitOpenAnimation({
  el,
  axis,
  fromPx,
  toPx = 0,
  generation,
  busyKey,
  onMotionStarted,
  onComplete,
  durationScale = 1,
}) {
  if (busyKey) setUiTransitionBusy(true, busyKey);
  const anim = animateMotionRelease(el, axis, fromPx, toPx, 0, null, null, durationScale);
  onMotionStarted?.(anim);
  anim.finished.then(() => {
    if (isExplicitMotionStale(el, generation)) return;
    endExplicitMotion(el);
    if (busyKey) setUiTransitionBusy(false, busyKey);
    onComplete?.();
  });
  return anim;
}

export function runExplicitCloseAnimation({
  el,
  axis,
  toPx,
  generation,
  busyKey,
  onComplete,
  durationScale = 1,
}) {
  if (busyKey) setUiTransitionBusy(true, busyKey);
  beginTargetReleaseAnimation(el, "close");
  const translate = axis === "x" ? "translateX" : "translateY";
  el.style.transform = `${translate}(0px)`;
  animateMotionRelease(el, axis, 0, toPx, 0, null, null, durationScale).finished.then(() => {
    if (isExplicitMotionStale(el, generation)) return;
    endTargetReleaseAnimation(el);
    onComplete?.();
    endExplicitMotion(el);
    if (busyKey) setUiTransitionBusy(false, busyKey);
  });
}
