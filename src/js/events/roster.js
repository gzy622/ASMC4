import {
  editRosterBtn,
  rosterEditorClose,
  rosterCancelBtn,
  rosterSaveBtn,
  rosterResetBtn,
  rosterEditorList
} from "../dom-refs.js";
import {
  openRosterEditor,
  closeRosterEditor,
  addEmptyRow,
  removeRow,
  saveRoster,
  resetRoster,
  setupDragHandlers
} from "../ui/roster.js";

export function bindRosterEvents() {
  editRosterBtn.addEventListener("click", openRosterEditor);
  rosterEditorClose.addEventListener("click", closeRosterEditor);
  rosterCancelBtn.addEventListener("click", closeRosterEditor);
  rosterSaveBtn.addEventListener("click", saveRoster);
  rosterResetBtn.addEventListener("click", resetRoster);
  setupDragHandlers();

  rosterEditorList.addEventListener("click", event => {
    const row = event.target.closest(".roster-row");
    if (!row) {
      if (event.target.closest("#rosterAddBtn")) {
        addEmptyRow();
      }
      return;
    }

    const actionBtn = event.target.closest("[data-action]");
    if (!actionBtn) return;

    const action = actionBtn.dataset.action;

    if (action === "toggle-nonenglish") {
      return;
    }

    event.preventDefault();

    if (action === "delete") {
      removeRow(row);
    }
  });

  rosterEditorList.addEventListener("keydown", event => {
    if (event.key === "Enter") {
      const input = event.target.closest(".roster-row-input");
      if (!input) return;
      event.preventDefault();

      const row = input.closest(".roster-row");
      const nextRow = row.nextElementSibling;
      if (nextRow && nextRow.classList.contains("roster-row")) {
        const nextInput = nextRow.querySelector(".roster-row-input");
        if (nextInput) nextInput.focus();
      } else {
        addEmptyRow();
      }
    }
  });
}
