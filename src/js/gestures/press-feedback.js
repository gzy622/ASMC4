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
  ".quick-chip",
  ".quick-action-btn",
  ".dialog-button",
  ".numpad-btn",
  ".score-action-btn",
  ".roster-foot-btn",
  ".roster-row-btn",
  ".roster-add-row",
].join(",");

const ASSIGNMENT_ITEM_INNER =
  ".assignment-item-action,.assignment-edit-input,.assignment-edit-subject";

const pressed = new Map();

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
}

phoneEl.addEventListener("pointerdown", (e) => {
  if (e.button && e.button !== 0) return;
  const el = resolve(e.target);
  if (!el || el.disabled) return;
  el.classList.add("is-pressed");
  pressed.set(e.pointerId, el);
});

phoneEl.addEventListener("pointerleave", (e) => clear(e.pointerId));
window.addEventListener("pointerup", (e) => clear(e.pointerId));
window.addEventListener("pointercancel", (e) => clear(e.pointerId));
