import { closeScoreSheet } from "../score-sheet/index.js";
import { drawer, mainPage, appShell, drawerSearchInput, drawerSubjectFilter } from "../dom-refs.js";
import { getState } from "../state.js";
import { setThemeColor } from "../utils/dom.js";
import { renderAssignmentList } from "../render/assignmentList.js";
import { setSuppressNextCardClick } from "../runtime.js";
import { isCrossPanelOpenBlocked } from "../gestures/motion-registry.js";
import {
  releaseLayerTransformLock,
  withNoAnimLayer,
} from "../gestures/pointer-drag-lifecycle.js";
import { createInteractiveLayerController } from "../gestures/interactive-layer-controller.js";

function clearDocumentSelection() {
  const selection = window.getSelection?.();
  if (selection && !selection.isCollapsed) {
    selection.removeAllRanges();
  }
}

function resetDrawerFilters() {
  if (drawerSearchInput) drawerSearchInput.value = "";
  if (drawerSubjectFilter) drawerSubjectFilter.value = "";
}

function blurDrawerFocus() {
  const active = document.activeElement;
  if (active && drawer.contains(active)) {
    active.blur();
  }
}

function getDrawerExpandScale() {
  const drawerWidth = drawer.offsetWidth;
  if (!drawerWidth) return 1;
  return appShell.clientWidth / drawerWidth;
}

function setDrawerExpandScale() {
  drawer.style.setProperty("--drawer-expand-scale", String(getDrawerExpandScale()));
}

function clearDrawerExpandScale() {
  drawer.style.removeProperty("--drawer-expand-scale");
}

let drawerRevealPx = drawer.offsetWidth;

if (typeof ResizeObserver === "function") {
  const drawerSizeObserver = new ResizeObserver(entries => {
    const width = entries[0]?.contentRect.width;
    if (Number.isFinite(width) && width > 0) drawerRevealPx = width;
  });
  drawerSizeObserver.observe(drawer);
}

export function getDrawerRevealPx() {
  return drawerRevealPx;
}

export function prepareDrawerGesture() {
  appShell.classList.add("is-drawer-preparing");
}

export function clearDrawerGesturePreparation() {
  appShell.classList.remove("is-drawer-preparing");
}

function prepareDrawerReveal() {
  const width = getDrawerRevealPx();
  appShell.style.setProperty("--drawer-reveal-width", `${width}px`);
  appShell.classList.add("is-drawer-revealing");
  drawer.setAttribute("aria-hidden", "false");
}

function cancelDrawerRevealPreview() {
  if (drawer.classList.contains("is-open")) return;
  appShell.classList.remove("is-drawer-revealing");
  appShell.style.removeProperty("--drawer-reveal-width");
  drawer.setAttribute("aria-hidden", "true");
}

function setDrawerOpenPressure(pressure) {
  if (pressure <= 0) {
    appShell.style.removeProperty("--drawer-shadow-alpha");
    return;
  }
  appShell.style.setProperty("--drawer-shadow-alpha", String(0.12 + pressure * 0.06));
}

export const drawerController = createInteractiveLayerController({
  stateEl: drawer,
  motionEl: mainPage,
  axis: "x",
  getClosedPx: () => 0,
  getOpenPx: getDrawerRevealPx,
  busyKey: "drawer",
  traceLabel: "drawer.motion",
  onOpenPressure: setDrawerOpenPressure,
  setOpenState(open) {
    drawer.classList.toggle("is-open", open);
    drawer.setAttribute("aria-hidden", open ? "false" : "true");
    if (open) prepareDrawerReveal();
    else {
      appShell.classList.remove("is-drawer-preparing", "is-drawer-revealing", "is-drawer-revealed");
      appShell.style.removeProperty("--drawer-reveal-width");
    }
  },
  onPrepareClosedDrag: prepareDrawerReveal,
  onCancelClosedDrag: cancelDrawerRevealPreview,
  onOpened() {
    appShell.classList.remove("is-drawer-preparing", "is-drawer-revealing");
    appShell.classList.add("is-drawer-revealed");
  },
  onBeforeClose() {
    appShell.classList.remove("is-drawer-revealed");
    appShell.classList.add("is-drawer-revealing");
  },
  onDragStarted() {
    appShell.classList.remove("is-drawer-revealed");
    appShell.classList.add("is-drawer-revealing");
  },
  onClosed() {
    clearDrawerGesturePreparation();
    resetDrawerFilters();
    setThemeColor("#f4f4f4");
  },
});

export function openDrawer({ withTransitionLock = true } = {}) {
  if (isCrossPanelOpenBlocked()) return;
  closeScoreSheet({ animate: false });
  clearDocumentSelection();
  setThemeColor("#f4f4f4");
  requestAnimationFrame(() => {
    renderAssignmentList(getState());
  });
  drawerController.open({ animate: withTransitionLock });
}

export function closeDrawer({ withTransitionLock = true } = {}) {
  blurDrawerFocus();
  setSuppressNextCardClick(false);
  drawer.classList.remove("is-expanding", "is-contracting");
  clearDrawerExpandScale();
  return drawerController.close({ animate: withTransitionLock });
}

export function expandDrawer() {
  releaseLayerTransformLock(drawer);
  setDrawerExpandScale();
  drawer.classList.remove("is-contracting");
  drawer.classList.add("is-expanding");
}

export function contractDrawer() {
  releaseLayerTransformLock(drawer);
  drawer.classList.add("is-contracting");
  drawer.classList.remove("is-expanding");
}

export function snapResetDrawer() {
  blurDrawerFocus();
  setSuppressNextCardClick(false);
  releaseLayerTransformLock(drawer);
  drawerController.snapClosed();
  withNoAnimLayer(drawer, () => {
    drawer.classList.remove("is-expanding", "is-contracting");
    clearDrawerExpandScale();
    drawer.style.willChange = "";
  });
}

export function snapPrepareDrawer() {
  releaseLayerTransformLock(drawer);
  setDrawerExpandScale();
  drawerController.snapOpen();
  withNoAnimLayer(drawer, () => {
    drawer.classList.remove("is-contracting");
    drawer.classList.add("is-expanding");
  });
}
