import { closeScoreSheet } from "../score-sheet/index.js";
import { addButton, layerScrim, newAssignmentPanel, newAssignmentTitleInput, newAssignmentSubjectInput, quickPanel, quickRenameInput } from "../dom-refs.js";
import { closeConfirm } from "./confirm.js";
import { closeDrawer, drawerController } from "./drawer.js";
import { refreshQuickPanelContent } from "../render/quickPanel.js";
import { makeDefaultAssignmentTitle } from "../utils/id.js";
import { resetQuickPanelView, restoreQuickPanelViewFromPreference, shouldShowQuickPanelHistoryContent } from "./history.js";
import {
  isCrossPanelOpenBlocked,
} from "../gestures/motion-registry.js";
import { endQuickPanelPullPreview } from "../gestures/layer-motion-state.js";
import { createInteractiveLayerController } from "../gestures/interactive-layer-controller.js";

let pendingNewAssignmentFocusFrame = 0;
let focusQuickNameWhenOpened = false;
let restoreAddFocusWhenClosed = false;
let restoreNewAssignmentFocusToAdd = true;
let newAssignmentOpenPromise = null;


function cancelPendingNewAssignmentFocus() {
  if (!pendingNewAssignmentFocusFrame) return;
  cancelAnimationFrame(pendingNewAssignmentFocusFrame);
  pendingNewAssignmentFocusFrame = 0;
}

function scheduleNewAssignmentFocus() {
  cancelPendingNewAssignmentFocus();
  pendingNewAssignmentFocusFrame = requestAnimationFrame(() => {
    pendingNewAssignmentFocusFrame = 0;
    if (!newAssignmentPanel.classList.contains("is-open")) return;
    newAssignmentTitleInput.focus();
  });
}

function closedTopSheetDelta(panel) {
  return -panel.offsetHeight;
}

function setTopSheetOpenState(panel, open) {
  panel.classList.toggle("is-open", open);
  panel.setAttribute("aria-hidden", open ? "false" : "true");
}

function setTopSheetOpenPressure(panel, pressure) {
  if (pressure <= 0) {
    panel.style.removeProperty("--open-pressure-offset");
    panel.style.removeProperty("--open-pressure-scale");
    return;
  }
  panel.style.setProperty("--open-pressure-offset", `${pressure * 3}px`);
  panel.style.setProperty("--open-pressure-scale", String(1 - pressure * 0.12));
}

export const quickPanelController = createInteractiveLayerController({
  stateEl: quickPanel,
  axis: "y",
  getClosedPx: () => closedTopSheetDelta(quickPanel),
  scrimEl: layerScrim,
  busyKey: "panel",
  traceLabel: "quickPanel.motion",
  setOpenState: open => setTopSheetOpenState(quickPanel, open),
  onOpenPressure: pressure => setTopSheetOpenPressure(quickPanel, pressure),
  onOpened() {
    endQuickPanelPullPreview();
    if (focusQuickNameWhenOpened) requestAnimationFrame(() => quickRenameInput?.focus());
    focusQuickNameWhenOpened = false;
  },
  onBeforeClose: blurTopSheetFocus,
  onClosed() {
    endQuickPanelPullPreview();
    focusQuickNameWhenOpened = false;
    resetQuickPanelView();
  },
});

export const newAssignmentPanelController = createInteractiveLayerController({
  stateEl: newAssignmentPanel,
  axis: "y",
  getClosedPx: () => closedTopSheetDelta(newAssignmentPanel),
  scrimEl: layerScrim,
  busyKey: "panel",
  traceLabel: "newAssignment.motion",
  setOpenState: open => setTopSheetOpenState(newAssignmentPanel, open),
  onOpenPressure: pressure => setTopSheetOpenPressure(newAssignmentPanel, pressure),
  onOpened: scheduleNewAssignmentFocus,
  onBeforeClose() {
    cancelPendingNewAssignmentFocus();
    blurTopSheetFocus();
  },
  onClosed() {
    if (restoreAddFocusWhenClosed) requestAnimationFrame(() => addButton.focus());
    restoreAddFocusWhenClosed = false;
    restoreNewAssignmentFocusToAdd = true;
  },
});

export function openNewAssignmentPanel({ fromDrawer = false } = {}) {
  if (newAssignmentOpenPromise) return newAssignmentOpenPromise;
  if (!fromDrawer && isCrossPanelOpenBlocked()) return Promise.resolve();

  const open = async () => {
    if (fromDrawer && drawerController.phase !== "closed") {
      await closeDrawer();
      if (drawerController.phase !== "closed") return;
    } else {
      await closeDrawer({ withTransitionLock: false });
    }

    closeFloatingPanels({ restoreFocus: false, animate: false });
    newAssignmentTitleInput.value = makeDefaultAssignmentTitle();
    if (newAssignmentSubjectInput) newAssignmentSubjectInput.value = "英语";
    restoreNewAssignmentFocusToAdd = !fromDrawer;
    await newAssignmentPanelController.open();
  };

  const request = open().finally(() => {
    if (newAssignmentOpenPromise === request) newAssignmentOpenPromise = null;
  });
  newAssignmentOpenPromise = request;
  return request;
}

function blurTopSheetFocus() {
  const active = document.activeElement;
  if (active && (newAssignmentPanel.contains(active) || quickPanel.contains(active))) {
    active.blur();
  }
}

export function closeFloatingPanels({ restoreFocus = true, animate = true } = {}) {
  const wasNewAssignmentPanelOpen = newAssignmentPanel.classList.contains("is-open");

  cancelPendingNewAssignmentFocus();
  blurTopSheetFocus();
  closeScoreSheet({ animate: false });
  endQuickPanelPullPreview();
  restoreAddFocusWhenClosed = restoreFocus
    && wasNewAssignmentPanelOpen
    && restoreNewAssignmentFocusToAdd;
  quickPanelController.close({ animate });
  newAssignmentPanelController.close({ animate });

  closeConfirm();
}

export function openQuickPanel({ focusName = false } = {}) {
  if (isCrossPanelOpenBlocked()) return;
  closeDrawer({ withTransitionLock: false });
  closeFloatingPanels({ restoreFocus: false, animate: false });
  restoreQuickPanelViewFromPreference();
  refreshQuickPanelContent(shouldShowQuickPanelHistoryContent());

  focusQuickNameWhenOpened = focusName;
  quickPanelController.open();
}

export function commitQuickPanelOpen() {
  quickPanelController.snapOpen();
}
