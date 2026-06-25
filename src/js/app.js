import { render } from "./render/index.js";
import { bindEvents } from "./events/index.js";
import "./gestures/score-swipe.js";
import "./gestures/drawer-gestures.js";
import "./gestures/panel-swipe.js";
import "./gestures/press-feedback.js";
import "./native-shim.js";

document.querySelector('meta[name="theme-color"]')?.setAttribute("content", "#f4f4f4");

bindEvents();
render();

const bootMask = document.getElementById("bootMask");
if (bootMask) {
  let disposed = false;
  let prevKey = null;
  let stableCount = 0;

  const reveal = () => {
    if (disposed) return;
    disposed = true;
    bootMask.classList.add("is-hidden");
    bootMask.addEventListener("transitionend", () => bootMask.remove(), { once: true });
  };

  const checkStable = () => {
    if (disposed) return;
    const grid = document.getElementById("studentGrid");
    if (!grid) { reveal(); return; }
    const { width, height } = grid.getBoundingClientRect();
    const key = `${width},${height}`;
    stableCount = key === prevKey ? stableCount + 1 : 0;
    prevKey = key;
    if (stableCount >= 2) { reveal(); return; }
    requestAnimationFrame(checkStable);
  };

  (document.fonts?.ready ?? Promise.resolve()).then(() => {
    requestAnimationFrame(checkStable);
  });

  setTimeout(reveal, 600);
}
