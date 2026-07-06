import { appShell, drawer } from "../dom-refs.js";
import { NAV_CHROME_SELECTOR } from "./gesture-guards.js";

const PRESSABLE = [
  NAV_CHROME_SELECTOR,
  ".student-card",
  ".drawer-action-btn",
  ".assignment-item-action",
  ".assignment-item",
  ".assignment-item-add",
  ".panel-close",
  ".panel-back",
  ".quick-action-btn",
  ".dialog-button",
  ".numpad-btn",
  ".score-display-backspace",
  ".score-action-btn",
  ".roster-foot-btn",
  ".roster-row-btn",
  ".roster-add-row",
].join(",");

const ASSIGNMENT_ITEM_INNER =
  ".assignment-item-actions,.assignment-item-action,.assignment-edit-input,.assignment-edit-subject";

const MIN_PRESS_VISIBLE_MS = 100;

const pressed = new Map();
const releaseTimers = new Map();
const pressStarts = new Map();
const pressStartedAt = new Map();
const MOVE_CANCEL_DISTANCE = 8;

function resolve(target) {
  const el = target.closest(PRESSABLE);
  if (!el) return null;
  if (
    drawer.classList.contains("is-open")
    && el.classList.contains("student-card")
    && !target.closest(".drawer")
  ) {
    return null;
  }
  if (
    el.classList.contains("assignment-item") &&
    target.closest(ASSIGNMENT_ITEM_INNER)
  )
    return null;
  return el;
}

function clear(pointerId) {
  const el = pressed.get(pointerId);
  if (el) {
    el.classList.remove("is-pressed");
    pressed.delete(pointerId);
  }
  pressStarts.delete(pointerId);
  pressStartedAt.delete(pointerId);

  const timer = releaseTimers.get(pointerId);
  if (timer) {
    clearTimeout(timer);
    releaseTimers.delete(pointerId);
  }
}

function clearAll() {
  Array.from(pressed.keys()).forEach(clear);
}

function clearElement(el) {
  Array.from(pressed.entries()).forEach(([pointerId, pressedEl]) => {
    if (pressedEl === el) clear(pointerId);
  });
}

function armAutoRelease(pointerId) {
  const timer = releaseTimers.get(pointerId);
  if (timer) clearTimeout(timer);

  releaseTimers.set(pointerId, setTimeout(() => {
    clear(pointerId);
  }, 600));
}

function scheduleClear(pointerId) {
  const startedAt = pressStartedAt.get(pointerId) ?? performance.now();
  const elapsed = performance.now() - startedAt;
  const delay = Math.max(0, MIN_PRESS_VISIBLE_MS - elapsed);

  const timer = releaseTimers.get(pointerId);
  if (timer) clearTimeout(timer);

  releaseTimers.set(pointerId, setTimeout(() => {
    clear(pointerId);
  }, delay));
}

function acknowledgeActivatedPress(el) {
  if (el.classList.contains("is-pressed")) return;
  el.classList.add("is-pressed");
  setTimeout(() => {
    el.classList.remove("is-pressed");
  }, MIN_PRESS_VISIBLE_MS);
}

appShell.addEventListener("pointerdown", (event) => {
  if (event.button && event.button !== 0) return;
  const el = resolve(event.target);
  if (!el || el.disabled) return;
  clear(event.pointerId);
  clearElement(el);
  el.classList.add("is-pressed");
  pressed.set(event.pointerId, el);
  pressStarts.set(event.pointerId, { x: event.clientX, y: event.clientY });
  pressStartedAt.set(event.pointerId, performance.now());
  armAutoRelease(event.pointerId);
});

appShell.addEventListener("pointermove", (event) => {
  const start = pressStarts.get(event.pointerId);
  if (!start) return;
  const dx = event.clientX - start.x;
  const dy = event.clientY - start.y;
  if (Math.hypot(dx, dy) >= MOVE_CANCEL_DISTANCE) {
    clear(event.pointerId);
  }
});

appShell.addEventListener("pointerleave", (event) => scheduleClear(event.pointerId));
window.addEventListener("pointerup", (event) => scheduleClear(event.pointerId), true);
window.addEventListener("pointercancel", (event) => scheduleClear(event.pointerId), true);
window.addEventListener("lostpointercapture", (event) => scheduleClear(event.pointerId), true);
window.addEventListener("blur", clearAll);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) clearAll();
});

// 合成 click / pointercancel 等导致 pointer 路径未留下 is-pressed 时，在 click 真正冒泡上来后补一次反馈。
appShell.addEventListener("click", (event) => {
  const el = resolve(event.target);
  if (!el || el.disabled) return;
  acknowledgeActivatedPress(el);
});
