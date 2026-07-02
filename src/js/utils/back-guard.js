import {
  confirmScrim,
  scoreSheet,
  rosterEditorPanel,
  settingsPanel,
  quickPanel,
  newAssignmentPanel,
  drawer
} from "../dom-refs.js";
import { closeConfirm } from "../ui/confirm.js";
import { closeScoreSheet } from "../score-sheet/index.js";
import { closeRosterEditor } from "../ui/roster.js";
import { closeSettings } from "../ui/settings.js";
import { closeFloatingPanels } from "../ui/panels.js";
import { closeDrawer } from "../ui/drawer.js";
import { overlayTransitionBusy } from "../runtime.js";
import { isNativePlatform } from "./native.js";

const OVERLAY_ELS = [
  confirmScrim,
  scoreSheet,
  rosterEditorPanel,
  settingsPanel,
  quickPanel,
  newAssignmentPanel,
  drawer
];

let barrierActive = false;

function anyOverlayOpen() {
  return OVERLAY_ELS.some(el => el.classList.contains("is-open"));
}

function ensureBarrier() {
  if (barrierActive) return;
  history.pushState({ asmc4: "back-guard" }, "");
  barrierActive = true;
}

function closeTopmostOverlay() {
  if (confirmScrim.classList.contains("is-open")) return closeConfirm();
  if (scoreSheet.classList.contains("is-open")) return closeScoreSheet();
  if (rosterEditorPanel.classList.contains("is-open")) return closeRosterEditor();
  if (settingsPanel.classList.contains("is-open")) return closeSettings();
  if (newAssignmentPanel.classList.contains("is-open") || quickPanel.classList.contains("is-open")) {
    return closeFloatingPanels();
  }
  if (drawer.classList.contains("is-open")) return closeDrawer();
}

if (!isNativePlatform()) {
  const mo = new MutationObserver(() => {
    if (anyOverlayOpen()) ensureBarrier();
  });
  for (const el of OVERLAY_ELS) {
    if (el) mo.observe(el, { attributes: true, attributeFilter: ["class"] });
  }

  window.addEventListener("popstate", () => {
    if (!barrierActive) return;
    barrierActive = false;
    if (overlayTransitionBusy) { ensureBarrier(); return; }
    if (anyOverlayOpen()) {
      closeTopmostOverlay();
      if (anyOverlayOpen()) ensureBarrier();
    }
  });
}
