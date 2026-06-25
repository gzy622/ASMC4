export function isNativePlatform() {
  return typeof window !== "undefined"
    && !!window.Capacitor
    && typeof window.Capacitor.isNativePlatform === "function"
    && window.Capacitor.isNativePlatform();
}
