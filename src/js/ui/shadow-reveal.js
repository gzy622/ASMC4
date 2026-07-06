import { PANEL_TRANSITION_MS } from "../gestures/constants.js";

const SHADOW_PENDING_CLASS = "is-shadow-pending";
const SETTLE_FALLBACK_MS = 40;
const pendingByEl = new WeakMap();

function finishShadowReveal(el) {
  const onSettled = pendingByEl.get(el)?.onSettled;
  cancelShadowReveal(el);
  onSettled?.();
}

export function beginShadowRevealAfterOpen(el, { onSettled } = {}) {
  cancelShadowReveal(el);
  el.classList.add(SHADOW_PENDING_CLASS);

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
  if (!state) {
    el.classList.remove(SHADOW_PENDING_CLASS);
    return;
  }
  if (state.onEnd) el.removeEventListener("transitionend", state.onEnd);
  if (state.timer) clearTimeout(state.timer);
  pendingByEl.delete(el);
  el.classList.remove(SHADOW_PENDING_CLASS);
}
