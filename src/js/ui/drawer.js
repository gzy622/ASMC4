import { closeScoreSheet } from "../score-sheet/index.js";
import { drawer, appShell, drawerSearchInput, drawerSubjectFilter } from "../dom-refs.js";
import { getState } from "../state.js";
import { setThemeColor } from "../utils/dom.js";
import { renderAssignmentList } from "../render/assignmentList.js";
import { setSuppressNextCardClick, setUiTransitionBusy } from "../runtime.js";
import { PANEL_TRANSITION_MS } from "../gestures/constants.js";
import { beginShadowRevealAfterOpen, cancelShadowReveal } from "./shadow-reveal.js";
import {
  endTargetReleaseAnimation,
  isCrossPanelOpenBlocked,
} from "../gestures/motion-registry.js";
import { cancelMotionAnimation } from "../gestures/gesture-motion-engine.js";
import {
  nextExplicitMotionGeneration,
  prepareExplicitOpenTransform,
  runExplicitOpenAnimation,
  runExplicitCloseAnimation,
} from "../gestures/explicit-open-motion.js";
import {
  snapMotionLayerClosed,
  snapMotionLayerOpen,
  releaseLayerTransformLock,
  withNoAnimLayer,
} from "../gestures/pointer-drag-lifecycle.js";

function clearDocumentSelection() {
  const selection = window.getSelection?.();
  if (selection && !selection.isCollapsed) {
    selection.removeAllRanges();
  }
}

function resetDrawerFilters() {
  if (drawerSearchInput) drawerSearchInput.value = "";
  if (drawerSubjectFilter) drawerSubjectFilter.value = "";
}

function blurDrawerFocus() {
  const active = document.activeElement;
  if (active && drawer.contains(active)) {
    active.blur();
  }
}

function getDrawerExpandScale() {
  const drawerWidth = drawer.offsetWidth;
  if (!drawerWidth) return 1;
  return appShell.clientWidth / drawerWidth;
}

function setDrawerExpandScale() {
  drawer.style.setProperty("--drawer-expand-scale", String(getDrawerExpandScale()));
}

function clearDrawerExpandScale() {
  drawer.style.removeProperty("--drawer-expand-scale");
}

export function getDrawerClosedPx() {
  return -1.2 * drawer.offsetWidth;
}

export function openDrawer({ withTransitionLock = true, deferShadow = true } = {}) {
  if (isCrossPanelOpenBlocked()) return;
  closeScoreSheet({ animate: false });
  clearDocumentSelection();
  const shouldAnimate = withTransitionLock;
  const fromPx = getDrawerClosedPx();
  if (shouldAnimate) {
    prepareExplicitOpenTransform(drawer, "x", fromPx);
    drawer.classList.add("is-open");
  } else {
    snapMotionLayerOpen(drawer);
  }
  drawer.setAttribute("aria-hidden", "false");
  setThemeColor("#f4f4f4");
  requestAnimationFrame(() => {
    renderAssignmentList(getState());
  });
  if (!shouldAnimate) return;
  const generation = nextExplicitMotionGeneration(drawer);
  runExplicitOpenAnimation({
    el: drawer,
    axis: "x",
    fromPx,
    generation,
    busyKey: withTransitionLock ? "drawer" : undefined,
    onMotionStarted: (anim) => {
      if (deferShadow) {
        beginShadowRevealAfterOpen(drawer, { motionFinished: anim.finished });
      }
    },
  });
}

export function closeDrawer({ withTransitionLock = true } = {}) {
  blurDrawerFocus();
  const hadDrawerLayer = drawer.classList.contains("is-open")
    || drawer.classList.contains("is-expanding");
  const shouldAnimate = withTransitionLock && hadDrawerLayer;
  const toPx = getDrawerClosedPx();
  setSuppressNextCardClick(false);
  cancelShadowReveal(drawer);

  if (shouldAnimate) {
    const generation = nextExplicitMotionGeneration(drawer);
    runExplicitCloseAnimation({
      el: drawer,
      axis: "x",
      toPx,
      generation,
      busyKey: "drawer",
      onComplete: () => {
        drawer.classList.remove("is-open");
        drawer.classList.remove("is-expanding");
        clearDrawerExpandScale();
        drawer.setAttribute("aria-hidden", "true");
        resetDrawerFilters();
        setThemeColor("#f4f4f4");
      },
    });
    return;
  }

  nextExplicitMotionGeneration(drawer);
  cancelMotionAnimation(drawer);
  endTargetReleaseAnimation(drawer);
  setUiTransitionBusy(false, "drawer");
  drawer.classList.remove("is-expanding");
  clearDrawerExpandScale();
  snapMotionLayerClosed(drawer);
  drawer.setAttribute("aria-hidden", "true");
  resetDrawerFilters();
  setThemeColor("#f4f4f4");
  if (withTransitionLock && hadDrawerLayer) {
    setUiTransitionBusy(true, "drawer");
    setTimeout(() => setUiTransitionBusy(false, "drawer"), PANEL_TRANSITION_MS);
  }
}

export function expandDrawer() {
  releaseLayerTransformLock(drawer);
  setDrawerExpandScale();
  drawer.classList.add("is-expanding");
}

export function contractDrawer() {
  releaseLayerTransformLock(drawer);
  drawer.classList.remove("is-expanding");
}

export function snapResetDrawer() {
  blurDrawerFocus();
  setSuppressNextCardClick(false);
  cancelShadowReveal(drawer);
  releaseLayerTransformLock(drawer);
  withNoAnimLayer(drawer, () => {
    drawer.classList.remove("is-expanding");
    drawer.classList.remove("is-open");
    clearDrawerExpandScale();
    drawer.style.willChange = "";
    drawer.setAttribute("aria-hidden", "true");
  });
}

export function snapPrepareDrawer() {
  releaseLayerTransformLock(drawer);
  setDrawerExpandScale();
  cancelShadowReveal(drawer);
  withNoAnimLayer(drawer, () => {
    drawer.style.transform = "";
    drawer.classList.add("is-open");
    drawer.classList.add("is-expanding");
    drawer.setAttribute("aria-hidden", "false");
  });
}
