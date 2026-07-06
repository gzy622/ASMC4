import { closeScoreSheet } from "../score-sheet/index.js";
import { drawer, appShell, drawerSearchInput, drawerSubjectFilter } from "../dom-refs.js";
import { getState } from "../state.js";
import { setThemeColor } from "../utils/dom.js";
import { renderAssignmentList } from "../render/assignmentList.js";
import { setSuppressNextCardClick, setUiTransitionBusy } from "../runtime.js";
import { PANEL_TRANSITION_MS } from "../gestures/constants.js";
import { beginShadowRevealAfterOpen, cancelShadowReveal } from "./shadow-reveal.js";

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

export function openDrawer({ withTransitionLock = true, deferShadow = true } = {}) {
  closeScoreSheet();
  clearDocumentSelection();
  drawer.classList.add("is-open");
  drawer.setAttribute("aria-hidden", "false");
  if (deferShadow) beginShadowRevealAfterOpen(drawer);
  setThemeColor("#f4f4f4");
  requestAnimationFrame(() => {
    renderAssignmentList(getState());
  });
  if (withTransitionLock) {
    setUiTransitionBusy(true, "drawer");
    setTimeout(() => setUiTransitionBusy(false, "drawer"), PANEL_TRANSITION_MS);
  }
}

export function closeDrawer({ withTransitionLock = true } = {}) {
  setSuppressNextCardClick(false);
  cancelShadowReveal(drawer);
  drawer.classList.remove("is-open");
  drawer.classList.remove("is-expanding");
  drawer.style.transform = "";
  clearDrawerExpandScale();
  drawer.setAttribute("aria-hidden", "true");
  resetDrawerFilters();
  setThemeColor("#f4f4f4");
  if (withTransitionLock) {
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
