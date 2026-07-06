import { PANEL_TRANSITION_MS } from "../gestures/constants.js";
import {
  beginLayerExplicitOpen,
  endLayerExplicitOpen,
  setLayerShadowPending,
} from "../gestures/layer-motion-state.js";

const MAX_EXPLICIT_OPEN_MS = 380;
const SETTLE_FALLBACK_MS = 60;
const pendingByEl = new WeakMap();

function finishShadowReveal(el) {
  const onSettled = pendingByEl.get(el)?.onSettled;
  cancelShadowReveal(el);
  onSettled?.();
}

function scheduleFinishShadowReveal(el) {
  requestAnimationFrame(() => {
    if (!pendingByEl.has(el)) return;
    finishShadowReveal(el);
  });
}

/** WAAPI 打开后显式收尾；与 begin 时传入的 motionFinished 等价，保留给无法提前拿到 Promise 的调用方。 */
export function settleShadowRevealAfterOpen(el) {
  if (!pendingByEl.has(el)) return;
  scheduleFinishShadowReveal(el);
}

function bindMotionFinished(el, motionFinished) {
  Promise.resolve(motionFinished).then(() => {
    if (!pendingByEl.has(el)) return;
    scheduleFinishShadowReveal(el);
  }).catch(() => {});
}

export function beginShadowRevealAfterOpen(el, { onSettled, motionFinished } = {}) {
  cancelShadowReveal(el);
  beginLayerExplicitOpen(el);
  setLayerShadowPending(el, true);

  const state = { onEnd: null, timer: null, onSettled };
  const useTransitionEnd = !motionFinished;

  if (useTransitionEnd) {
    state.onEnd = (event) => {
      if (event.target !== el || event.propertyName !== "transform") return;
      finishShadowReveal(el);
    };
    el.addEventListener("transitionend", state.onEnd);
  } else {
    bindMotionFinished(el, motionFinished);
  }

  state.timer = setTimeout(() => {
    if (!pendingByEl.has(el)) return;
    if (useTransitionEnd && el.classList.contains("no-anim")) {
      state.timer = setTimeout(() => finishShadowReveal(el), SETTLE_FALLBACK_MS);
      return;
    }
    finishShadowReveal(el);
  }, Math.max(PANEL_TRANSITION_MS, MAX_EXPLICIT_OPEN_MS) + SETTLE_FALLBACK_MS);
  pendingByEl.set(el, state);
}

export function cancelShadowReveal(el) {
  const state = pendingByEl.get(el);
  endLayerExplicitOpen(el);
  setLayerShadowPending(el, false);
  if (!state) return;
  if (state.onEnd) el.removeEventListener("transitionend", state.onEnd);
  if (state.timer) clearTimeout(state.timer);
  pendingByEl.delete(el);
}
