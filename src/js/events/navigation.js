import {
  addButton,
  confirmPanel,
  drawer,
  drawerCloseButton,
  menuButton,
  newAssignmentCancelButton,
  newAssignmentCloseButton,
  newAssignmentPanel,
  quickPanel,
  quickPanelCloseButton,
  rosterEditorPanel,
  scoreSheet,
  settingsPanel,
  phoneEl,
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

function consumeOverlayEmptyClick(event) {
  event.preventDefault();
  event.stopImmediatePropagation();
}

function hasOpenOverlay() {
  return (
    confirmPanel.classList.contains("is-open")
    || scoreSheet.classList.contains("is-open")
    || rosterEditorPanel.classList.contains("is-open")
    || settingsPanel.classList.contains("is-open")
    || newAssignmentPanel.classList.contains("is-open")
    || quickPanel.classList.contains("is-open")
    || drawer.classList.contains("is-open")
  );
}

function bindEmptyAreaClose() {
  phoneEl.addEventListener("click", event => {
    if (!(event.target instanceof Element)) return;
    if (overlayTransitionBusy) {
      if (hasOpenOverlay()) consumeOverlayEmptyClick(event);
      return;
    }
    if (confirmPanel.classList.contains("is-open")) return;

    if (scoreSheet.classList.contains("is-open")) {
      if (event.target.closest(".score-sheet")) return;
      consumeOverlayEmptyClick(event);
      closeScoreSheet();
      return;
    }

    if (rosterEditorPanel.classList.contains("is-open")) {
      if (event.target.closest("#rosterEditorPanel")) return;
      consumeOverlayEmptyClick(event);
      closeRosterEditor();
      return;
    }

    if (settingsPanel.classList.contains("is-open")) {
      if (event.target.closest("#settingsPanel")) return;
      consumeOverlayEmptyClick(event);
      closeSettings();
      return;
    }

    if (newAssignmentPanel.classList.contains("is-open") || quickPanel.classList.contains("is-open")) {
      if (event.target.closest("#newAssignmentPanel, #quickPanel")) return;
      consumeOverlayEmptyClick(event);
      closeAllCenterPanels();
      return;
    }

    if (drawer.classList.contains("is-open")) {
      if (event.target.closest(".drawer")) return;
      consumeOverlayEmptyClick(event);
      closeDrawer();
    }
  }, true);
}

export function bindNavigationEvents() {
  bindEmptyAreaClose();

  menuButton.addEventListener("click", openDrawer);
  drawerCloseButton.addEventListener("click", closeDrawer);
  drawer.addEventListener("selectstart", event => {
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest(".assignment-edit-input, .assignment-edit-subject")) return;
    event.preventDefault();
  });

  addButton.addEventListener("click", openNewAssignmentPanel);
  newAssignmentCloseButton.addEventListener("click", closeAllCenterPanels);
  newAssignmentCancelButton.addEventListener("click", closeAllCenterPanels);

  titleButton.addEventListener("click", () => openQuickPanel());
  titleButton.addEventListener("keydown", event => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openQuickPanel({ focusName: true });
    }
  });
  quickPanelCloseButton.addEventListener("click", closeAllCenterPanels);

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
