import { closeScoreSheet } from "../score-sheet/index.js";
import { drawer } from "../dom-refs.js";
import { getState } from "../state.js";
import { setThemeColor } from "../utils/dom.js";
import { renderAssignmentList } from "../render/assignmentList.js";
import { closeFloatingPanels } from "./panels.js";
import { expandDrawer, contractDrawer, snapResetDrawer, snapPrepareDrawer } from "./drawer.js";
import { uiTransitionBusy, setUiTransitionBusy } from "../runtime.js";

const EXPAND_DURATION = 280;
const CONTENT_FADE = 180;

function wait(ms) {
  return new Promise(r => setTimeout(r, ms));
}

export async function openDrawerFullscreenPanel(panel, renderFn) {
  if (uiTransitionBusy) return;
  setUiTransitionBusy(true);

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

  setUiTransitionBusy(false);
}

export async function swapDrawerFullscreenPanel(fromPanel, toPanel, renderFn) {
  if (uiTransitionBusy) return;
  setUiTransitionBusy(true);

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
  setUiTransitionBusy(false);
}

export async function closeDrawerFullscreenPanel(panel) {
  if (uiTransitionBusy) return;
  setUiTransitionBusy(true);

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

  setUiTransitionBusy(false);
}
