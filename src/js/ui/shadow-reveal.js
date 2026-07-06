import { PANEL_TRANSITION_MS } from "../gestures/constants.js";
import {
  beginLayerExplicitOpen,
  endLayerExplicitOpen,
  setLayerShadowPending,
} from "../gestures/layer-motion-state.js";

const SETTLE_FALLBACK_MS = 40;
const pendingByEl = new WeakMap();

function finishShadowReveal(el) {
  const onSettled = pendingByEl.get(el)?.onSettled;
  cancelShadowReveal(el);
  onSettled?.();
}

export function beginShadowRevealAfterOpen(el, { onSettled } = {}) {
  cancelShadowReveal(el);
  beginLayerExplicitOpen(el);
  setLayerShadowPending(el, true);

  const state = { onEnd: null, timer: null, onSettled };

  state.onEnd = (event) => {
    if (event.target !== el || event.propertyName !== "transform") return;
    finishShadowReveal(el);
  };

  state.timer = setTimeout(() => finishShadowReveal(el), PANEL_TRANSITION_MS + SETTLE_FALLBACK_MS);
  el.addEventListener("transitionend", state.onEnd);
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
