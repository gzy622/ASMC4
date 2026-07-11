import { closeScoreSheet } from "../score-sheet/index.js";
import { appShell, drawer } from "../dom-refs.js";
import { getState } from "../state.js";
import { setThemeColor, waitForTransition } from "../utils/dom.js";
import { renderAssignmentList } from "../render/assignmentList.js";
import { closeFloatingPanels } from "./panels.js";
import { expandDrawer, contractDrawer, snapResetDrawer, snapPrepareDrawer } from "./drawer.js";
import { isUiTransitionBusy, setUiTransitionBusy } from "../runtime.js";
import {
  beginTargetExplicitOpenAnimation,
  endTargetExplicitOpenAnimation,
  isCrossPanelOpenBlocked,
} from "../gestures/motion-registry.js";

const DRAWER_OPEN_DURATION = 320;
const EXPAND_DURATION = 280;
const CONTENT_FADE = 180;
const SHADOW_FADE = 140;
const TRANSITION_TIMEOUT_PAD = 80;
const DRAWER_SHADOW_HIDDEN_CLASS = "is-drawer-shadow-hidden";
const DRAWER_SHADOW_FADING_CLASS = "is-drawer-shadow-fading";

function waitForAnimationFrame() {
  return new Promise(resolve => requestAnimationFrame(resolve));
}

export async function openDrawerFullscreenPanel(panel, renderFn) {
  if (isCrossPanelOpenBlocked()) return;
  if (isUiTransitionBusy("drawer-fullscreen")) return;
  setUiTransitionBusy(true, "drawer-fullscreen");
  beginTargetExplicitOpenAnimation(drawer);
  beginTargetExplicitOpenAnimation(panel);

  try {
    closeScoreSheet({ animate: false });
    closeFloatingPanels();

    renderFn();

    drawer.classList.add("is-open");
    drawer.setAttribute("aria-hidden", "false");

    if (isUiTransitionBusy("drawer")) {
      await waitForTransition(drawer, {
        property: "transform",
        timeoutMs: DRAWER_OPEN_DURATION + TRANSITION_TIMEOUT_PAD,
      }).promise;
    }

    void drawer.offsetWidth;
    await waitForAnimationFrame();
    expandDrawer();
    await waitForTransition(drawer, {
      property: "transform",
      timeoutMs: EXPAND_DURATION + TRANSITION_TIMEOUT_PAD,
    }).promise;

    panel.classList.remove("is-closing");
    panel.classList.add("is-open");
    panel.setAttribute("aria-hidden", "false");
    await waitForTransition(panel, {
      property: "opacity",
      timeoutMs: CONTENT_FADE + TRANSITION_TIMEOUT_PAD,
    }).promise;

    snapResetDrawer();
  } finally {
    endTargetExplicitOpenAnimation(drawer);
    endTargetExplicitOpenAnimation(panel);
    setUiTransitionBusy(false, "drawer-fullscreen");
  }
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
  }).promise;
  fromPanel.classList.remove("is-closing");

  renderFn();

  toPanel.classList.remove("is-closing");
  toPanel.classList.add("is-open");
  toPanel.setAttribute("aria-hidden", "false");
  await waitForTransition(toPanel, {
    property: "opacity",
    timeoutMs: CONTENT_FADE + TRANSITION_TIMEOUT_PAD,
  }).promise;

  snapResetDrawer();
  setUiTransitionBusy(false, "drawer-fullscreen");
}

export async function closeDrawerFullscreenPanel(panel) {
  if (isUiTransitionBusy("drawer-fullscreen")) return;
  setUiTransitionBusy(true, "drawer-fullscreen");
  appShell.classList.add(DRAWER_SHADOW_HIDDEN_CLASS);

  try {
    panel.classList.add("is-closing");
    panel.classList.remove("is-open");
    panel.setAttribute("aria-hidden", "true");
    await waitForTransition(panel, {
      property: "opacity",
      timeoutMs: CONTENT_FADE + TRANSITION_TIMEOUT_PAD,
    }).promise;
    panel.classList.remove("is-closing");

    snapPrepareDrawer();

    renderAssignmentList(getState());

    await waitForAnimationFrame();
    contractDrawer();
    await waitForTransition(drawer, {
      property: "transform",
      timeoutMs: EXPAND_DURATION + TRANSITION_TIMEOUT_PAD,
    }).promise;
    drawer.classList.remove("is-contracting");

    appShell.classList.add(DRAWER_SHADOW_FADING_CLASS);
    await waitForTransition(appShell, {
      property: "opacity",
      timeoutMs: SHADOW_FADE + TRANSITION_TIMEOUT_PAD,
    }).promise;

    // 同一批样式更新完成临时阴影与主页阴影的交接，避免叠加变深。
    appShell.classList.remove(DRAWER_SHADOW_FADING_CLASS, DRAWER_SHADOW_HIDDEN_CLASS);
    setThemeColor("#f4f4f4");
  } finally {
    panel.classList.remove("is-closing");
    drawer.classList.remove("is-contracting");
    appShell.classList.remove(DRAWER_SHADOW_FADING_CLASS, DRAWER_SHADOW_HIDDEN_CLASS);
    setUiTransitionBusy(false, "drawer-fullscreen");
  }
}
