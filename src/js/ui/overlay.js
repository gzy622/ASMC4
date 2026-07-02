import { closeScoreSheet } from "../score-sheet/index.js";
import { closeFloatingPanels } from "./panels.js";
import { drawer } from "../dom-refs.js";
import {
  expandDrawer,
  contractDrawer,
  snapResetDrawer,
  snapPrepareDrawer
} from "./drawer.js";
import {
  overlayTransitionBusy,
  setOverlayTransitionBusy
} from "../runtime.js";
import { getState } from "../state.js";
import { renderAssignmentList } from "../render/assignmentList.js";
import { setThemeColor } from "../utils/dom.js";

const EXPAND_DURATION = 280;
const CONTENT_FADE = 180;

function wait(ms) {
  return new Promise(r => setTimeout(r, ms));
}

export async function openOverlay(panel, renderFn) {
  if (overlayTransitionBusy) return;
  setOverlayTransitionBusy(true);

  closeScoreSheet();
  closeFloatingPanels();

  renderFn();

  drawer.classList.add("is-open");
  drawer.setAttribute("aria-hidden", "false");

  expandDrawer();
  await wait(EXPAND_DURATION);

  panel.classList.remove("is-closing");
  panel.classList.add("is-open");
  panel.setAttribute("aria-hidden", "false");
  await wait(CONTENT_FADE);

  snapResetDrawer();

  setOverlayTransitionBusy(false);
}

export async function swapOverlay(fromPanel, toPanel, renderFn) {
  if (overlayTransitionBusy) return;
  setOverlayTransitionBusy(true);

  fromPanel.classList.add("is-closing");
  fromPanel.classList.remove("is-open");
  fromPanel.setAttribute("aria-hidden", "true");
  await wait(CONTENT_FADE);
  fromPanel.classList.remove("is-closing");

  renderFn();

  toPanel.classList.remove("is-closing");
  toPanel.classList.add("is-open");
  toPanel.setAttribute("aria-hidden", "false");
  await wait(CONTENT_FADE);

  snapResetDrawer();
  setOverlayTransitionBusy(false);
}

export async function closeOverlay(panel) {
  if (overlayTransitionBusy) return;
  setOverlayTransitionBusy(true);

  panel.classList.add("is-closing");
  panel.classList.remove("is-open");
  panel.setAttribute("aria-hidden", "true");
  await wait(CONTENT_FADE);
  panel.classList.remove("is-closing");

  snapPrepareDrawer();

  renderAssignmentList(getState());

  contractDrawer();
  await wait(EXPAND_DURATION);

  setThemeColor("#f4f4f4");

  setOverlayTransitionBusy(false);
}
