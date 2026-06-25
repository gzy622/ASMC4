import { isNativePlatform } from "./native.js";

export async function hapticLight() {
  if (!isNativePlatform()) return;
  const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
  Haptics.impact({ style: ImpactStyle.Light });
}
