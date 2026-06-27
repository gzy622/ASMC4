import { confirmPanel, confirmScrim, confirmTitle, confirmMessage, confirmOkButton } from "../dom-refs.js";
import { setPendingConfirmAction } from "../runtime.js";

export function openConfirm(options) {
  setPendingConfirmAction(options.onConfirm);

  confirmTitle.textContent = options.title || "确认操作";
  confirmMessage.textContent = options.message || "";
  confirmOkButton.textContent = options.okText || "确认";
  confirmOkButton.classList.toggle("danger", Boolean(options.danger));
  confirmOkButton.classList.toggle("primary", !options.danger);

  confirmScrim.classList.add("is-open");
  confirmPanel.classList.add("is-open");
  confirmPanel.setAttribute("aria-hidden", "false");
}

confirmScrim.addEventListener("click", () => {
  if (!confirmScrim.classList.contains("is-open")) return;
  confirmPanel.classList.add("is-flashing");
});
confirmPanel.addEventListener("animationend", () => {
  confirmPanel.classList.remove("is-flashing");
});

export function closeConfirm() {
  setPendingConfirmAction(null);
  confirmScrim.classList.remove("is-open");
  confirmPanel.classList.remove("is-open");
  confirmPanel.setAttribute("aria-hidden", "true");
}
