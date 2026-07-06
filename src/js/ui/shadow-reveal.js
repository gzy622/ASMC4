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

function bindMotionFinished(el, motionFinished) {
  if (!motionFinished) return;
  Promise.resolve(motionFinished).then(() => {
    if (!pendingByEl.has(el)) return;
    scheduleFinishShadowReveal(el);
  }).catch(() => {});
}

export function beginShadowRevealAfterOpen(el, { onSettled, motionFinished } = {}) {
  cancelShadowReveal(el);
  beginLayerExplicitOpen(el);
  setLayerShadowPending(el, true);

  const fallbackMs = Math.max(PANEL_TRANSITION_MS, MAX_EXPLICIT_OPEN_MS) + SETTLE_FALLBACK_MS;
  const state = { timer: null, onSettled };

  bindMotionFinished(el, motionFinished);
  state.timer = setTimeout(() => {
    if (!pendingByEl.has(el)) return;
    finishShadowReveal(el);
  }, fallbackMs);

  pendingByEl.set(el, state);
}

export function cancelShadowReveal(el) {
  const state = pendingByEl.get(el);
  endLayerExplicitOpen(el);
  setLayerShadowPending(el, false);
  if (!state) return;
  if (state.timer) clearTimeout(state.timer);
  pendingByEl.delete(el);
}
