import { isUiTransitionBusy } from "./runtime.js";
import { isNativePlatform } from "./utils/native.js";
import { closeTopmostFloatingLayer } from "./ui/floating-layers.js";

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
    if (isUiTransitionBusy()) return;
    if (closeTopmostFloatingLayer()) return;
    App.exitApp();
  });
})();
