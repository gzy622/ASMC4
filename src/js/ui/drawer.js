import { closeScoreSheet } from "../score-sheet/index.js";
import { drawer, drawerScrim } from "../dom-refs.js";
import { getState } from "../state.js";
import { setThemeColor } from "../utils/dom.js";
import { renderAssignmentList } from "../render/assignmentList.js";

export function openDrawer() {
  closeScoreSheet();
  renderAssignmentList(getState());
  drawer.classList.add("is-open");
  drawerScrim.classList.add("is-open");
  drawer.setAttribute("aria-hidden", "false");
  setThemeColor("#f4f4f4");
}

export function closeDrawer() {
  drawer.classList.remove("is-open");
  drawerScrim.classList.remove("is-open");
  drawer.setAttribute("aria-hidden", "true");
  setThemeColor("#f4f4f4");
}
