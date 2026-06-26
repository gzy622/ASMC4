import {
  addButton,
  confirmPanel,
  drawer,
  drawerCloseButton,
  drawerScrim,
  menuButton,
  modalScrim,
  newAssignmentCancelButton,
  newAssignmentCloseButton,
  newAssignmentPanel,
  quickPanel,
  quickPanelCloseButton,
  rosterEditorPanel,
  scoreSheet,
  settingsPanel,
  titleButton
} from "../dom-refs.js";
import { closeDrawer, openDrawer } from "../ui/drawer.js";
import {
  closeAllCenterPanels,
  openNewAssignmentPanel,
  openQuickPanel
} from "../ui/panels.js";
import { closeConfirm } from "../ui/confirm.js";
import { closeScoreSheet } from "../score-sheet/index.js";
import { closeRosterEditor } from "../ui/roster.js";
import { closeSettings } from "../ui/settings.js";
import { overlayTransitionBusy } from "../runtime.js";

export function bindNavigationEvents() {
  menuButton.addEventListener("click", openDrawer);
  drawerCloseButton.addEventListener("click", closeDrawer);
  drawerScrim.addEventListener("click", closeDrawer);

  addButton.addEventListener("click", openNewAssignmentPanel);
  newAssignmentCloseButton.addEventListener("click", closeAllCenterPanels);
  newAssignmentCancelButton.addEventListener("click", closeAllCenterPanels);

  titleButton.addEventListener("click", openQuickPanel);
  titleButton.addEventListener("keydown", event => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openQuickPanel();
    }
  });
  quickPanelCloseButton.addEventListener("click", closeAllCenterPanels);

  modalScrim.addEventListener("click", () => {
    if (confirmPanel.classList.contains("is-open")) return;
    closeAllCenterPanels();
  });

  document.addEventListener("keydown", event => {
    if (event.key !== "Escape") return;
    if (overlayTransitionBusy) return;
    event.preventDefault();

    if (confirmPanel.classList.contains("is-open")) {
      closeConfirm();
    } else if (scoreSheet.classList.contains("is-open")) {
      closeScoreSheet();
    } else if (rosterEditorPanel.classList.contains("is-open")) {
      closeRosterEditor();
    } else if (settingsPanel.classList.contains("is-open")) {
      closeSettings();
    } else if (
      newAssignmentPanel.classList.contains("is-open")
      || quickPanel.classList.contains("is-open")
    ) {
      closeAllCenterPanels();
    } else if (drawer.classList.contains("is-open")) {
      closeDrawer();
    }
  });
}
