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
  el.classList.add("no-anim");
  const translate = axis === "x" ? "translateX" : "translateY";
  el.style.transform = `${translate}(${fromPx}px)`;
}

export function runExplicitOpenAnimation({
  el,
  axis,
  fromPx,
  toPx = 0,
  generation,
  onMotionStarted,
  onComplete,
}) {
  const anim = animateMotionRelease(el, axis, fromPx, toPx, 0);
  onMotionStarted?.(anim);
  anim.finished.then(() => {
    if (isExplicitMotionStale(el, generation)) return;
    endExplicitMotion(el);
    onComplete?.();
  });
  return anim;
}
