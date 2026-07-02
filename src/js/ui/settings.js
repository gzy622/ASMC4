import { settingsPanel } from "../dom-refs.js";
import { renderSettingsState } from "../render/settings.js";
import { getState } from "../state.js";
import { openDrawerFullscreenPanel, closeDrawerFullscreenPanel } from "./drawer-fullscreen.js";

export function openSettings() {
  openDrawerFullscreenPanel(settingsPanel, () => renderSettingsState(getState()));
}

export async function closeSettings() {
  return closeDrawerFullscreenPanel(settingsPanel);
}
