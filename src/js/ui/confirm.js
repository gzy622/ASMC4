import { confirmPanel, confirmTitle, confirmMessage, confirmOkButton, modalScrim, newAssignmentPanel, quickPanel } from "../dom-refs.js";
import { setPendingConfirmAction } from "../runtime.js";

export function openConfirm(options) {
  setPendingConfirmAction(options.onConfirm);

  confirmTitle.textContent = options.title || "确认操作";
  confirmMessage.textContent = options.message || "";
  confirmOkButton.textContent = options.okText || "确认";
  confirmOkButton.classList.toggle("danger", Boolean(options.danger));
  confirmOkButton.classList.toggle("primary", !options.danger);

  modalScrim.classList.add("is-open");
  confirmPanel.classList.add("is-open");
  confirmPanel.setAttribute("aria-hidden", "false");
}

export function closeConfirm() {
  setPendingConfirmAction(null);
  confirmPanel.classList.remove("is-open");
  confirmPanel.setAttribute("aria-hidden", "true");

  if (!newAssignmentPanel.classList.contains("is-open") && !quickPanel.classList.contains("is-open")) {
    modalScrim.classList.remove("is-open");
  }
}
