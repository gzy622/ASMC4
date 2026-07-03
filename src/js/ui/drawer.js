import { closeScoreSheet } from "../score-sheet/index.js";
import { drawer, phoneEl } from "../dom-refs.js";
import { getState } from "../state.js";
import { setThemeColor } from "../utils/dom.js";
import { renderAssignmentList } from "../render/assignmentList.js";
import { uiTransitionBusy, setUiTransitionBusy, setSuppressNextCardClick } from "../runtime.js";

const DRAWER_TRANSITION_MS = 320;

function clearDocumentSelection() {
  const selection = window.getSelection?.();
  if (selection && !selection.isCollapsed) {
    selection.removeAllRanges();
  }
}

function getDrawerExpandScale() {
  const drawerWidth = drawer.offsetWidth;
  if (!drawerWidth) return 1;
  return phoneEl.clientWidth / drawerWidth;
}

function setDrawerExpandScale() {
  drawer.style.setProperty("--drawer-expand-scale", String(getDrawerExpandScale()));
}

function clearDrawerExpandScale() {
  drawer.style.removeProperty("--drawer-expand-scale");
}

export function openDrawer({ withTransitionLock = true } = {}) {
  if (uiTransitionBusy) return;
  closeScoreSheet();
  clearDocumentSelection();
  drawer.classList.add("is-open");
  drawer.setAttribute("aria-hidden", "false");
  setThemeColor("#f4f4f4");
  requestAnimationFrame(() => {
    renderAssignmentList(getState());
  });
  if (withTransitionLock) {
    setUiTransitionBusy(true);
    setTimeout(() => setUiTransitionBusy(false), DRAWER_TRANSITION_MS);
  }
}

export function closeDrawer({ withTransitionLock = true } = {}) {
  setSuppressNextCardClick(false);
  drawer.classList.remove("is-open");
  drawer.classList.remove("is-expanding");
  drawer.style.transform = "";
  clearDrawerExpandScale();
  drawer.setAttribute("aria-hidden", "true");
  setThemeColor("#f4f4f4");
  if (withTransitionLock) {
    setUiTransitionBusy(true);
    setTimeout(() => setUiTransitionBusy(false), DRAWER_TRANSITION_MS);
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
  drawer.classList.add("no-anim");
  drawer.classList.add("is-open");
  drawer.classList.add("is-expanding");
  drawer.setAttribute("aria-hidden", "false");
  void drawer.offsetHeight;
  drawer.classList.remove("no-anim");
}
