import { settingsPanel } from "../dom-refs.js";
import { renderSettingsState } from "../render/settings.js";
import { getState } from "../state.js";
import { openOverlay, closeOverlay } from "./overlay.js";

export function openSettings() {
  openOverlay(settingsPanel, () => renderSettingsState(getState()));
}

export async function closeSettings() {
  return closeOverlay(settingsPanel);
}
