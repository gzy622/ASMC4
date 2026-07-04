import { isUiTransitionBusy } from "../runtime.js";
import { isNativePlatform } from "./native.js";
import {
  FLOATING_LAYER_ELS,
  anyFloatingLayerOpen,
  closeTopmostFloatingLayer
} from "../ui/floating-layers.js";

let barrierActive = false;
let backGuardSuspended = false;

function ensureBarrier() {
  if (barrierActive) return;
  history.pushState({ asmc4: "back-guard" }, "");
  barrierActive = true;
}

export function suspendBackGuard() {
  if (isNativePlatform()) return;
  backGuardSuspended = true;
}

export function resumeBackGuard() {
  if (isNativePlatform()) return;
  backGuardSuspended = false;
  if (anyFloatingLayerOpen()) ensureBarrier();
}

if (!isNativePlatform()) {
  const mo = new MutationObserver(() => {
    if (anyFloatingLayerOpen()) ensureBarrier();
  });
  for (const el of FLOATING_LAYER_ELS) {
    if (el) mo.observe(el, { attributes: true, attributeFilter: ["class"] });
  }

  window.addEventListener("popstate", () => {
    if (backGuardSuspended) {
      if (anyFloatingLayerOpen()) ensureBarrier();
      return;
    }
    if (!barrierActive) return;
    barrierActive = false;
    if (isUiTransitionBusy()) { ensureBarrier(); return; }
    if (anyFloatingLayerOpen()) {
      closeTopmostFloatingLayer();
      if (anyFloatingLayerOpen()) ensureBarrier();
    }
  });
}
