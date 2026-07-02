import { closeScoreSheet } from "../score-sheet/index.js";
import { drawer } from "../dom-refs.js";
import { getState } from "../state.js";
import { setThemeColor } from "../utils/dom.js";
import { renderAssignmentList } from "../render/assignmentList.js";
import { uiTransitionBusy, setUiTransitionBusy, setSuppressNextCardClick } from "../runtime.js";

const DRAWER_TRANSITION_MS = 320;

export function openDrawer({ withTransitionLock = true } = {}) {
  if (uiTransitionBusy) return;
  closeScoreSheet();
  renderAssignmentList(getState());
  drawer.classList.add("is-open");
  drawer.setAttribute("aria-hidden", "false");
  setThemeColor("#f4f4f4");
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
  drawer.setAttribute("aria-hidden", "true");
  setThemeColor("#f4f4f4");
  if (withTransitionLock) {
    setUiTransitionBusy(true);
    setTimeout(() => setUiTransitionBusy(false), DRAWER_TRANSITION_MS);
  }
}

export function expandDrawer() {
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
  drawer.setAttribute("aria-hidden", "true");
  void drawer.offsetHeight;
  drawer.classList.remove("no-anim");
}

export function snapPrepareDrawer() {
  drawer.classList.add("no-anim");
  drawer.classList.add("is-open");
  drawer.classList.add("is-expanding");
  drawer.setAttribute("aria-hidden", "false");
  void drawer.offsetHeight;
  drawer.classList.remove("no-anim");
}
