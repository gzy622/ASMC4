import { closeScoreSheet } from "../score-sheet/index.js";
import { drawer, drawerScrim } from "../dom-refs.js";
import { getState } from "../state.js";
import { setThemeColor } from "../utils/dom.js";
import { renderAssignmentList } from "../render/assignmentList.js";
import { overlayTransitionBusy } from "../runtime.js";

export function openDrawer() {
  if (overlayTransitionBusy) return;
  closeScoreSheet();
  renderAssignmentList(getState());
  drawer.classList.add("is-open");
  drawerScrim.classList.add("is-open");
  drawer.setAttribute("aria-hidden", "false");
  setThemeColor("#f4f4f4");
}

export function closeDrawer() {
  if (overlayTransitionBusy) return;
  drawer.classList.remove("is-open");
  drawerScrim.classList.remove("is-open");
  drawer.setAttribute("aria-hidden", "true");
  setThemeColor("#f4f4f4");
}

export function expandDrawer() {
  drawer.classList.add("is-expanding");
}

export function contractDrawer() {
  drawer.classList.remove("is-expanding");
}

export function snapResetDrawer() {
  drawer.classList.add("no-anim");
  drawer.classList.remove("is-expanding");
  drawer.classList.remove("is-open");
  drawerScrim.classList.remove("is-open");
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
