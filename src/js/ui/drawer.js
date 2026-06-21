import { closeScoreSheet } from "../score-sheet/index.js";
import { drawer, drawerScrim } from "../dom-refs.js";
import { setThemeColor } from "../utils/dom.js";

export function openDrawer() {
  closeScoreSheet();
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
