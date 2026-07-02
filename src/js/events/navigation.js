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
  closeFloatingPanels,
  openNewAssignmentPanel,
  openQuickPanel
} from "../ui/panels.js";
import { closeConfirm } from "../ui/confirm.js";
import { closeScoreSheet } from "../score-sheet/index.js";
import { closeRosterEditor } from "../ui/roster.js";
import { closeSettings } from "../ui/settings.js";
import { uiTransitionBusy } from "../runtime.js";

function consumeFloatingLayerEmptyClick(event) {
  event.preventDefault();
  event.stopImmediatePropagation();
}

function anyFloatingLayerOpen() {
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
    if (event.target.closest("#appToast")) return;
    if (uiTransitionBusy) {
      if (anyFloatingLayerOpen()) consumeFloatingLayerEmptyClick(event);
      return;
    }
    if (confirmPanel.classList.contains("is-open")) return;

    if (scoreSheet.classList.contains("is-open")) {
      if (event.target.closest(".score-sheet")) return;
      consumeFloatingLayerEmptyClick(event);
      closeScoreSheet();
      return;
    }

    if (rosterEditorPanel.classList.contains("is-open")) {
      if (event.target.closest("#rosterEditorPanel")) return;
      consumeFloatingLayerEmptyClick(event);
      closeRosterEditor();
      return;
    }

    if (settingsPanel.classList.contains("is-open")) {
      if (event.target.closest("#settingsPanel")) return;
      consumeFloatingLayerEmptyClick(event);
      closeSettings();
      return;
    }

    if (newAssignmentPanel.classList.contains("is-open") || quickPanel.classList.contains("is-open")) {
      if (event.target.closest("#newAssignmentPanel, #quickPanel")) return;
      consumeFloatingLayerEmptyClick(event);
      closeFloatingPanels();
      return;
    }

    if (drawer.classList.contains("is-open")) {
      if (event.target.closest(".drawer")) return;
      consumeFloatingLayerEmptyClick(event);
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
  newAssignmentCloseButton.addEventListener("click", closeFloatingPanels);
  newAssignmentCancelButton.addEventListener("click", closeFloatingPanels);

  titleButton.addEventListener("click", () => openQuickPanel());
  titleButton.addEventListener("keydown", event => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openQuickPanel({ focusName: true });
    }
  });
  quickPanelCloseButton.addEventListener("click", closeFloatingPanels);

  document.addEventListener("keydown", event => {
    if (event.key !== "Escape") return;
    if (uiTransitionBusy) return;
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
      closeFloatingPanels();
    } else if (drawer.classList.contains("is-open")) {
      closeDrawer();
    }
  });
}
