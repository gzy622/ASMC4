import {
  confirmScrim,
  scoreSheet,
  rosterEditorPanel,
  settingsPanel,
  quickPanel,
  newAssignmentPanel,
  drawer
} from "./dom-refs.js";
import { closeConfirm } from "./ui/confirm.js";
import { closeScoreSheet } from "./score-sheet/index.js";
import { closeRosterEditor } from "./ui/roster.js";
import { closeSettings } from "./ui/settings.js";
import { closeFloatingPanels } from "./ui/panels.js";
import { closeDrawer } from "./ui/drawer.js";
import { overlayTransitionBusy } from "./runtime.js";
import { isNativePlatform } from "./utils/native.js";

(async () => {
  if (!isNativePlatform()) return;

  const { App } = await import("@capacitor/app");
  const { StatusBar, Style } = await import("@capacitor/status-bar");
  const { KeepAwake } = await import("@capacitor-community/keep-awake");

  document.body.classList.add("is-native");
  StatusBar.setStyle({ style: Style.Light });
  StatusBar.setBackgroundColor({ color: "#f4f4f4" });
  StatusBar.setOverlaysWebView({ overlay: true });

  KeepAwake.keepAwake();
  App.addListener("appStateChange", ({ isActive }) => {
    if (isActive) KeepAwake.keepAwake();
    else KeepAwake.allowSleep();
  });

  App.addListener("backButton", () => {
    if (overlayTransitionBusy) return;

    if (confirmScrim.classList.contains("is-open")) {
      closeConfirm();
      return;
    }
    if (scoreSheet.classList.contains("is-open")) {
      closeScoreSheet();
      return;
    }
    if (rosterEditorPanel.classList.contains("is-open")) {
      closeRosterEditor();
      return;
    }
    if (settingsPanel.classList.contains("is-open")) {
      closeSettings();
      return;
    }
    if (quickPanel.classList.contains("is-open") || newAssignmentPanel.classList.contains("is-open")) {
      closeFloatingPanels();
      return;
    }
    if (drawer.classList.contains("is-open")) {
      closeDrawer();
      return;
    }

    App.exitApp();
  });
})();
