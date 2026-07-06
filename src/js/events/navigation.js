import {
  addButton,
  confirmPanel,
  drawer,
  drawerSearchInput,
  drawerSubjectFilter,
  menuButton,
  newAssignmentCancelButton,
  newAssignmentCloseButton,
  newAssignmentPanel,
  quickPanel,
  quickPanelCloseButton,
  rosterEditorPanel,
  scoreSheet,
  settingsPanel,
  appShell,
  titleButton
} from "../dom-refs.js";
import { closeScoreSheet } from "../score-sheet/index.js";
import { closeRosterEditor } from "../ui/roster.js";
import { closeSettings } from "../ui/settings.js";
import { closeFloatingPanels, openNewAssignmentPanel, openQuickPanel } from "../ui/panels.js";
import { anyFloatingLayerOpen, closeTopmostFloatingLayer } from "../ui/floating-layers.js";
import { closeDrawer, openDrawer } from "../ui/drawer.js";
import { setSuppressNextCardClick, isUiTransitionBusy } from "../runtime.js";
import { getState } from "../state.js";
import { renderAssignmentList } from "../render/assignmentList.js";
import { traceEvent } from "../utils/trace.js";
import { isPrimaryChromeClick } from "../gestures/gesture-guards.js";

function consumeFloatingLayerEmptyClick(event) {
  event.preventDefault();
  event.stopImmediatePropagation();
}

function bindEmptyAreaClose() {
  appShell.addEventListener("click", event => {
    if (!(event.target instanceof Element)) return;
    if (event.target.closest("#appToast")) return;
    if (event.target.closest("#importBackupInput")) return;
    if (isPrimaryChromeClick(event.target)) return;
    if (isUiTransitionBusy()) {
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
      setSuppressNextCardClick(true);
      closeDrawer();
    }
  }, true);
}

export function bindNavigationEvents() {
  bindEmptyAreaClose();

  menuButton.addEventListener("click", () => {
    traceEvent("navigation.drawer.open");
    openDrawer();
  });
  drawer.addEventListener("selectstart", event => {
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest(".assignment-edit-input, .assignment-edit-subject, .drawer-search")) return;
    event.preventDefault();
  });

  drawerSearchInput?.addEventListener("input", () => renderAssignmentList(getState()));
  drawerSubjectFilter?.addEventListener("change", () => renderAssignmentList(getState()));

  addButton.addEventListener("click", () => {
    traceEvent("navigation.newAssignment.open");
    openNewAssignmentPanel();
  });
  newAssignmentCloseButton.addEventListener("click", () => {
    traceEvent("navigation.panels.close");
    closeFloatingPanels();
  });
  newAssignmentCancelButton.addEventListener("click", () => {
    traceEvent("navigation.panels.close");
    closeFloatingPanels();
  });

  titleButton.addEventListener("click", () => {
    traceEvent("navigation.quickPanel.open");
    openQuickPanel();
  });
  titleButton.addEventListener("keydown", event => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      traceEvent("navigation.quickPanel.open");
      openQuickPanel({ focusName: true });
    }
  });
  quickPanelCloseButton.addEventListener("click", () => {
    traceEvent("navigation.panels.close");
    closeFloatingPanels();
  });

  document.addEventListener("keydown", event => {
    if (event.key !== "Escape") return;
    if (isUiTransitionBusy()) return;
    event.preventDefault();
    traceEvent("navigation.escape");
    closeTopmostFloatingLayer();
  });
}
