import { phoneEl } from "../dom-refs.js";

const PRESSABLE = [
  ".student-card",
  ".nav-button",
  ".icon-button",
  ".title-wrap",
  ".drawer-action-btn",
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
  ".assignment-item-action,.assignment-edit-input,.assignment-edit-subject";

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

phoneEl.addEventListener("pointerdown", (e) => {
  if (e.button && e.button !== 0) return;
  const el = resolve(e.target);
  if (!el || el.disabled) return;
  clear(e.pointerId);
  clearElement(el);
  el.classList.add("is-pressed");
  pressed.set(e.pointerId, el);
  pressStarts.set(e.pointerId, { x: e.clientX, y: e.clientY });
  armAutoRelease(e.pointerId);
});

phoneEl.addEventListener("pointermove", (e) => {
  const start = pressStarts.get(e.pointerId);
  if (!start) return;
  const dx = e.clientX - start.x;
  const dy = e.clientY - start.y;
  if (Math.hypot(dx, dy) >= MOVE_CANCEL_DISTANCE) {
    clear(e.pointerId);
  }
});

phoneEl.addEventListener("pointerleave", (e) => clear(e.pointerId));
window.addEventListener("pointerup", (e) => clear(e.pointerId), true);
window.addEventListener("pointercancel", (e) => clear(e.pointerId), true);
window.addEventListener("lostpointercapture", (e) => clear(e.pointerId), true);
window.addEventListener("blur", clearAll);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) clearAll();
});
