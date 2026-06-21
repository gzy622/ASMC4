import { render } from "./render/index.js";
import "./events/index.js";
import "./gestures/score-swipe.js";
import "./gestures/drawer-gestures.js";

document.querySelector('meta[name="theme-color"]')?.setAttribute("content", "#f4f4f4");

render();
