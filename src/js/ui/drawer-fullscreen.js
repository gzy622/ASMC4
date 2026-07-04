import { closeScoreSheet } from "../score-sheet/index.js";
import { drawer } from "../dom-refs.js";
import { getState } from "../state.js";
import { setThemeColor } from "../utils/dom.js";
import { renderAssignmentList } from "../render/assignmentList.js";
import { closeFloatingPanels } from "./panels.js";
import { expandDrawer, contractDrawer, snapResetDrawer, snapPrepareDrawer } from "./drawer.js";
import { isUiTransitionBusy, setUiTransitionBusy } from "../runtime.js";

const EXPAND_DURATION = 280;
const CONTENT_FADE = 180;
const TRANSITION_TIMEOUT_PAD = 80;

function waitForTransition(el, { property = null, timeoutMs = 400 } = {}) {
  return new Promise(resolve => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      el.removeEventListener("transitionend", onEnd);
      clearTimeout(timer);
      resolve();
    };
    const onEnd = (event) => {
      if (!el.contains(event.target)) return;
      if (property && event.propertyName !== property) return;
      finish();
    };
    el.addEventListener("transitionend", onEnd);
    const timer = setTimeout(finish, timeoutMs);
  });
}

export async function openDrawerFullscreenPanel(panel, renderFn) {
  if (isUiTransitionBusy("drawer-fullscreen")) return;
  setUiTransitionBusy(true, "drawer-fullscreen");

  closeScoreSheet();
  closeFloatingPanels();

  renderFn();

  drawer.classList.add("is-open");
  drawer.setAttribute("aria-hidden", "false");

  expandDrawer();
  await waitForTransition(drawer, {
    property: "transform",
    timeoutMs: EXPAND_DURATION + TRANSITION_TIMEOUT_PAD,
  });

  panel.classList.remove("is-closing");
  panel.classList.add("is-open");
  panel.setAttribute("aria-hidden", "false");
  await waitForTransition(panel, {
    property: "opacity",
    timeoutMs: CONTENT_FADE + TRANSITION_TIMEOUT_PAD,
  });

  snapResetDrawer();

  setUiTransitionBusy(false, "drawer-fullscreen");
}

export async function swapDrawerFullscreenPanel(fromPanel, toPanel, renderFn) {
  if (isUiTransitionBusy("drawer-fullscreen")) return;
  setUiTransitionBusy(true, "drawer-fullscreen");

  fromPanel.classList.add("is-closing");
  fromPanel.classList.remove("is-open");
  fromPanel.setAttribute("aria-hidden", "true");
  await waitForTransition(fromPanel, {
    property: "opacity",
    timeoutMs: CONTENT_FADE + TRANSITION_TIMEOUT_PAD,
  });
  fromPanel.classList.remove("is-closing");

  renderFn();

  toPanel.classList.remove("is-closing");
  toPanel.classList.add("is-open");
  toPanel.setAttribute("aria-hidden", "false");
  await waitForTransition(toPanel, {
    property: "opacity",
    timeoutMs: CONTENT_FADE + TRANSITION_TIMEOUT_PAD,
  });

  snapResetDrawer();
  setUiTransitionBusy(false, "drawer-fullscreen");
}

export async function closeDrawerFullscreenPanel(panel) {
  if (isUiTransitionBusy("drawer-fullscreen")) return;
  setUiTransitionBusy(true, "drawer-fullscreen");

  panel.classList.add("is-closing");
  panel.classList.remove("is-open");
  panel.setAttribute("aria-hidden", "true");
  await waitForTransition(panel, {
    property: "opacity",
    timeoutMs: CONTENT_FADE + TRANSITION_TIMEOUT_PAD,
  });
  panel.classList.remove("is-closing");

  snapPrepareDrawer();

  renderAssignmentList(getState());

  await new Promise(resolve => requestAnimationFrame(resolve));
  contractDrawer();
  await waitForTransition(drawer, {
    property: "transform",
    timeoutMs: EXPAND_DURATION + TRANSITION_TIMEOUT_PAD,
  });

  setThemeColor("#f4f4f4");

  setUiTransitionBusy(false, "drawer-fullscreen");
}
