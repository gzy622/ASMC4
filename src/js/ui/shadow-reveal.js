import { PANEL_TRANSITION_MS } from "../gestures/constants.js";
import {
  beginLayerExplicitOpen,
  endLayerExplicitOpen,
  setLayerShadowPending,
} from "../gestures/layer-motion-state.js";
import { waitForTransition } from "../utils/dom.js";

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

  const state = { cancelTransitionWait: null, timer: null, onSettled };
  const useTransitionEnd = !motionFinished;
  const fallbackMs = Math.max(PANEL_TRANSITION_MS, MAX_EXPLICIT_OPEN_MS) + SETTLE_FALLBACK_MS;

  if (useTransitionEnd) {
    const { promise, cancel } = waitForTransition(el, {
      property: "transform",
      timeoutMs: fallbackMs,
      onTimeout: () => (el.classList.contains("no-anim") ? SETTLE_FALLBACK_MS : 0),
    });
    state.cancelTransitionWait = cancel;
    promise.then(() => {
      if (!pendingByEl.has(el)) return;
      finishShadowReveal(el);
    });
  } else {
    bindMotionFinished(el, motionFinished);
    state.timer = setTimeout(() => {
      if (!pendingByEl.has(el)) return;
      finishShadowReveal(el);
    }, fallbackMs);
  }

  pendingByEl.set(el, state);
}

export function cancelShadowReveal(el) {
  const state = pendingByEl.get(el);
  endLayerExplicitOpen(el);
  setLayerShadowPending(el, false);
  if (!state) return;
  state.cancelTransitionWait?.();
  if (state.timer) clearTimeout(state.timer);
  pendingByEl.delete(el);
}
