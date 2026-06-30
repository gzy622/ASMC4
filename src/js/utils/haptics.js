import { isNativePlatform } from "./native.js";
import { getState } from "../state.js";

let hapticsMod = null;

function canHaptic() {
  return isNativePlatform() && getState().hapticsEnabled !== false;
}

async function loadHaptics() {
  if (!hapticsMod) {
    hapticsMod = await import("@capacitor/haptics");
  }
  return hapticsMod;
}

export async function hapticLight() {
  if (!canHaptic()) return;
  const { Haptics, ImpactStyle } = await loadHaptics();
  Haptics.impact({ style: ImpactStyle.Light });
}

// ponytail: Android selectionChanged() is a no-op until selectionStart(); use impact instead.
export async function hapticSelection() {
  return hapticLight();
}
