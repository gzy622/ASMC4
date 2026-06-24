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

requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    const bootMask = document.getElementById("bootMask");
    if (bootMask) {
      bootMask.classList.add("is-hidden");
      bootMask.addEventListener("transitionend", () => bootMask.remove(), { once: true });
    }
  });
});
