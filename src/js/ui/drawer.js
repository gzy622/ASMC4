import { closeScoreSheet } from "../score-sheet/index.js";
import { drawer, appShell, drawerSearchInput, drawerSubjectFilter } from "../dom-refs.js";
import { getState } from "../state.js";
import { setThemeColor } from "../utils/dom.js";
import { renderAssignmentList } from "../render/assignmentList.js";
import { setSuppressNextCardClick, setUiTransitionBusy } from "../runtime.js";
import { PANEL_TRANSITION_MS } from "../gestures/constants.js";
import { beginShadowRevealAfterOpen, cancelShadowReveal, settleShadowRevealAfterOpen } from "./shadow-reveal.js";
import {
  beginTargetReleaseAnimation,
  endTargetReleaseAnimation,
  isCrossPanelOpenBlocked,
} from "../gestures/motion-registry.js";
import { animateMotionRelease, cancelMotionAnimation } from "../gestures/gesture-motion-engine.js";

let drawerMotionGeneration = 0;

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

function drawerClosedPx() {
  return -1.2 * drawer.offsetWidth;
}

function clearDrawerMotionStyles() {
  drawer.style.transition = "none";
  drawer.style.transform = "";
  drawer.style.willChange = "";
  void drawer.offsetHeight;
  drawer.style.transition = "";
}

function endDrawerExplicitMotion() {
  clearDrawerMotionStyles();
  drawer.classList.remove("no-anim");
  void drawer.offsetHeight;
}

export function openDrawer({ withTransitionLock = true, deferShadow = true } = {}) {
  if (isCrossPanelOpenBlocked()) return;
  closeScoreSheet();
  clearDocumentSelection();
  const shouldAnimate = withTransitionLock;
  const fromPx = drawerClosedPx();
  if (shouldAnimate) {
    drawer.classList.add("no-anim");
    drawer.style.transform = `translateX(${fromPx}px)`;
  }
  drawer.classList.add("is-open");
  drawer.setAttribute("aria-hidden", "false");
  if (deferShadow) beginShadowRevealAfterOpen(drawer);
  setThemeColor("#f4f4f4");
  requestAnimationFrame(() => {
    renderAssignmentList(getState());
  });
  if (withTransitionLock) {
    setUiTransitionBusy(true, "drawer");
    if (!shouldAnimate) {
      setTimeout(() => setUiTransitionBusy(false, "drawer"), PANEL_TRANSITION_MS);
    }
  }
  if (!shouldAnimate) return;
  const generation = ++drawerMotionGeneration;
  animateMotionRelease(drawer, "x", fromPx, 0, 0).finished.then(() => {
    if (generation !== drawerMotionGeneration) return;
    endDrawerExplicitMotion();
    settleShadowRevealAfterOpen(drawer);
    setUiTransitionBusy(false, "drawer");
  });
}

export function closeDrawer({ withTransitionLock = true } = {}) {
  const hadDrawerLayer = drawer.classList.contains("is-open")
    || drawer.classList.contains("is-expanding");
  const shouldAnimate = withTransitionLock && hadDrawerLayer;
  const toPx = drawerClosedPx();
  setSuppressNextCardClick(false);
  cancelShadowReveal(drawer);

  if (shouldAnimate) {
    const generation = ++drawerMotionGeneration;
    setUiTransitionBusy(true, "drawer");
    drawer.classList.add("no-anim");
    beginTargetReleaseAnimation(drawer, "close");
    drawer.style.transform = "translateX(0)";
    animateMotionRelease(drawer, "x", 0, toPx, 0).finished.then(() => {
      if (generation !== drawerMotionGeneration) return;
      drawer.classList.remove("is-open");
      drawer.classList.remove("is-expanding");
      clearDrawerExpandScale();
      drawer.setAttribute("aria-hidden", "true");
      resetDrawerFilters();
      setThemeColor("#f4f4f4");
      endTargetReleaseAnimation(drawer);
      endDrawerExplicitMotion();
      setUiTransitionBusy(false, "drawer");
    });
    return;
  }

  drawerMotionGeneration += 1;
  cancelMotionAnimation(drawer);
  endTargetReleaseAnimation(drawer);
  setUiTransitionBusy(false, "drawer");
  drawer.classList.remove("is-open");
  drawer.classList.remove("is-expanding");
  clearDrawerMotionStyles();
  clearDrawerExpandScale();
  drawer.setAttribute("aria-hidden", "true");
  resetDrawerFilters();
  setThemeColor("#f4f4f4");
  if (withTransitionLock && hadDrawerLayer) {
    setUiTransitionBusy(true, "drawer");
    setTimeout(() => setUiTransitionBusy(false, "drawer"), PANEL_TRANSITION_MS);
  }
}

export function expandDrawer() {
  setDrawerExpandScale();
  drawer.classList.add("is-expanding");
}

export function contractDrawer() {
  drawer.classList.remove("is-expanding");
}

export function snapResetDrawer() {
  setSuppressNextCardClick(false);
  cancelShadowReveal(drawer);
  drawer.classList.add("no-anim");
  drawer.classList.remove("is-expanding");
  drawer.classList.remove("is-open");
  clearDrawerExpandScale();
  drawer.setAttribute("aria-hidden", "true");
  void drawer.offsetHeight;
  drawer.classList.remove("no-anim");
}

export function snapPrepareDrawer() {
  setDrawerExpandScale();
  cancelShadowReveal(drawer);
  drawer.classList.add("no-anim");
  drawer.classList.add("is-open");
  drawer.classList.add("is-expanding");
  drawer.setAttribute("aria-hidden", "false");
  void drawer.offsetHeight;
  drawer.classList.remove("no-anim");
}
