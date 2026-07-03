import { appShell } from "../dom-refs.js";

const PRESSABLE = [
  ".student-card",
  ".nav-button",
  ".icon-button",
  ".title-wrap",
  ".drawer-action-btn",
  ".assignment-item-action",
  ".assignment-item",
  ".assignment-item-add",
  ".panel-close",
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

const pressed = new Map();
const releaseTimers = new Map();
const pressStarts = new Map();
const MOVE_CANCEL_DISTANCE = 8;

function resolve(target) {
  const el = target.closest(PRESSABLE);
  if (!el) return null;
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

appShell.addEventListener("pointerdown", (event) => {
  if (event.button && event.button !== 0) return;
  const el = resolve(event.target);
  if (!el || el.disabled) return;
  clear(event.pointerId);
  clearElement(el);
  el.classList.add("is-pressed");
  pressed.set(event.pointerId, el);
  pressStarts.set(event.pointerId, { x: event.clientX, y: event.clientY });
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

appShell.addEventListener("pointerleave", (event) => clear(event.pointerId));
window.addEventListener("pointerup", (event) => clear(event.pointerId), true);
window.addEventListener("pointercancel", (event) => clear(event.pointerId), true);
window.addEventListener("lostpointercapture", (event) => clear(event.pointerId), true);
window.addEventListener("blur", clearAll);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) clearAll();
});
