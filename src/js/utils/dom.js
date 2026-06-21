import { liveStatus } from "../dom-refs.js";

export function setThemeColor(color) {
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute("content", color);
  }
}

export function announce(message) {
  liveStatus.textContent = message;
}
