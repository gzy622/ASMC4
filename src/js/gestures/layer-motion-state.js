import { quickPanel, drawer } from "../dom-refs.js";

/** @typedef {'idle' | 'dragging' | 'settling-open' | 'settling-close' | 'explicit-opening'} LayerMotionPhase */

const MOTION_DRAGGING_CLASS = "is-motion-dragging";
const PULL_PREVIEW_CLASS = "is-dragging";
const SHADOW_PENDING_CLASS = "is-shadow-pending";

/** @type {WeakMap<Element, { phase: LayerMotionPhase, pullPreview: boolean, shadowPending: boolean }>} */
const stateByEl = new WeakMap();

function defaultState() {
  return { phase: "idle", pullPreview: false, shadowPending: false };
}

function getState(el) {
  if (!stateByEl.has(el)) {
    stateByEl.set(el, defaultState());
  }
  return stateByEl.get(el);
}

function syncClasses(el) {
  const { phase, pullPreview, shadowPending } = getState(el);
  const motionDragging = phase === "dragging"
    || phase === "settling-open"
    || phase === "settling-close";
  el.classList.toggle(MOTION_DRAGGING_CLASS, motionDragging);
  if (el === quickPanel) {
    el.classList.toggle(PULL_PREVIEW_CLASS, pullPreview);
  }
  el.classList.toggle(SHADOW_PENDING_CLASS, shadowPending);
}

function setPhase(el, phase) {
  getState(el).phase = phase;
  syncClasses(el);
}

export function getLayerMotionPhase(el) {
  return getState(el).phase;
}

export function beginLayerDrag(el) {
  setPhase(el, "dragging");
}

export function endLayerDrag(el) {
  if (getState(el).phase === "dragging") {
    setPhase(el, "idle");
  }
}

export function clearLayerMotionDrag(el) {
  const state = getState(el);
  if (state.phase === "dragging" || state.phase === "settling-open" || state.phase === "settling-close") {
    state.phase = "idle";
    syncClasses(el);
  }
}

export function beginLayerReleaseAnimation(el, direction = "close") {
  setPhase(el, direction === "open" ? "settling-open" : "settling-close");
}

export function endLayerReleaseAnimation(el) {
  const state = getState(el);
  if (state.phase === "settling-open" || state.phase === "settling-close") {
    state.phase = "idle";
    syncClasses(el);
  }
}

export function beginLayerExplicitOpen(el) {
  setPhase(el, "explicit-opening");
}

export function endLayerExplicitOpen(el) {
  if (getState(el).phase === "explicit-opening") {
    setPhase(el, "idle");
  }
}

export function setLayerShadowPending(el, active) {
  const state = getState(el);
  state.shadowPending = active;
  syncClasses(el);
}

export function beginQuickPanelPullPreview() {
  const state = getState(quickPanel);
  state.pullPreview = true;
  syncClasses(quickPanel);
}

export function endQuickPanelPullPreview() {
  const state = getState(quickPanel);
  state.pullPreview = false;
  syncClasses(quickPanel);
}

export function isQuickPanelPullPreview() {
  return getState(quickPanel).pullPreview;
}

export function isLayerReleaseAnimating(el) {
  const phase = getState(el).phase;
  return phase === "settling-open" || phase === "settling-close";
}

export function isLayerMotionDragging(el) {
  const phase = getState(el).phase;
  return phase === "dragging" || phase === "settling-open" || phase === "settling-close";
}

export function isLayerReleaseOpening(el) {
  return getState(el).phase === "settling-open";
}

export function isLayerExplicitOpening(el) {
  return getState(el).phase === "explicit-opening";
}

export function isLayerOpeningAnimating(el) {
  if (!el) return false;
  if (isLayerReleaseOpening(el)) return true;
  if (isLayerExplicitOpening(el)) return true;
  if (el === quickPanel && isQuickPanelPullPreview()) return true;
  if (
    el === drawer
    && !el.classList.contains("is-open")
    && getState(el).phase === "dragging"
    && !isLayerReleaseAnimating(el)
  ) {
    return true;
  }
  return false;
}

export function isLayerOpenForGestureBlock(el) {
  return isLayerOpeningAnimating(el)
    || (el?.classList.contains("is-open") && !isLayerReleaseAnimating(el));
}
