import { quickPanel, quickPanelMainView, quickPanelHistoryView, quickPanelBody } from "../dom-refs.js";
import { isQuickPanelPrefersHistoryView, setQuickPanelPrefersHistoryView } from "../runtime.js";

const FADE_DURATION = 180;
const HEIGHT_DURATION = 280;

let switching = false;
let pendingTargetView = null;
let activeSwitchPromise = null;

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function measureHeightWithView(fromEl, toEl) {
  const originalFromHidden = fromEl.hidden;
  const originalToHidden = toEl.hidden;

  fromEl.hidden = true;
  toEl.hidden = false;
  void quickPanelBody.offsetHeight;

  const height = quickPanelBody.getBoundingClientRect().height;

  fromEl.hidden = originalFromHidden;
  toEl.hidden = originalToHidden;

  return height;
}

function clearQuickPanelBodySwitchingState() {
  quickPanelBody.style.height = "";
  quickPanelBody.style.transition = "";
  quickPanelBody.classList.remove("is-view-switching");
}

function lockHistoryViewHeight() {
  const height = quickPanelMainView.getBoundingClientRect().height;
  if (height > 0) {
    quickPanelBody.style.setProperty("--quick-history-view-height", `${height}px`);
  }
}

function clearHistoryViewHeight() {
  quickPanelBody.style.removeProperty("--quick-history-view-height");
}

async function switchView(fromEl, toEl) {
  const startHeight = quickPanelBody.getBoundingClientRect().height;
  const targetHeight = measureHeightWithView(fromEl, toEl);

  quickPanelBody.classList.add("is-view-switching");
  quickPanelBody.style.height = `${startHeight}px`;
  quickPanelBody.style.transition = `height ${HEIGHT_DURATION}ms var(--motion)`;
  void quickPanelBody.offsetHeight;

  fromEl.classList.add("is-view-fading");
  requestAnimationFrame(() => {
    quickPanelBody.style.height = `${targetHeight}px`;
  });
  await wait(FADE_DURATION);

  fromEl.hidden = true;
  fromEl.classList.remove("is-view-fading");

  toEl.hidden = false;
  toEl.classList.add("is-view-fading");
  void toEl.offsetHeight;
  requestAnimationFrame(() => toEl.classList.remove("is-view-fading"));
  await wait(Math.max(HEIGHT_DURATION - FADE_DURATION, FADE_DURATION));

  clearQuickPanelBodySwitchingState();
}

function getActiveView() {
  return quickPanelHistoryView.hidden ? quickPanelMainView : quickPanelHistoryView;
}

function requestViewSwitch(toEl) {
  pendingTargetView = toEl;

  if (switching) return activeSwitchPromise;

  switching = true;
  activeSwitchPromise = (async () => {
    while (pendingTargetView) {
      const targetEl = pendingTargetView;
      pendingTargetView = null;

      if (targetEl === quickPanelHistoryView) {
        lockHistoryViewHeight();
      }

      const fromEl = getActiveView();
      if (fromEl !== targetEl) {
        await switchView(fromEl, targetEl);
      }

      if (targetEl === quickPanelMainView) {
        clearHistoryViewHeight();
      }
    }
  })().finally(() => {
    switching = false;
    pendingTargetView = null;
    activeSwitchPromise = null;
  });

  return activeSwitchPromise;
}

export function switchToHistoryView() {
  setQuickPanelPrefersHistoryView(true);
  return requestViewSwitch(quickPanelHistoryView);
}

export function switchToMainView() {
  setQuickPanelPrefersHistoryView(false);
  return requestViewSwitch(quickPanelMainView);
}

export function resetQuickPanelView() {
  clearQuickPanelBodySwitchingState();
  clearHistoryViewHeight();

  quickPanelHistoryView.hidden = true;
  quickPanelHistoryView.classList.remove("is-view-fading");

  quickPanelMainView.hidden = false;
  quickPanelMainView.classList.remove("is-view-fading");

  switching = false;
  pendingTargetView = null;
  activeSwitchPromise = null;
}

export function isHistoryViewActive() {
  return !quickPanelHistoryView.hidden;
}

export function restoreQuickPanelViewFromPreference() {
  clearQuickPanelBodySwitchingState();

  if (isQuickPanelPrefersHistoryView()) {
    lockHistoryViewHeight();
    quickPanelHistoryView.hidden = false;
    quickPanelHistoryView.classList.remove("is-view-fading");
    quickPanelMainView.hidden = true;
    quickPanelMainView.classList.remove("is-view-fading");
    return;
  }

  clearHistoryViewHeight();
  quickPanelHistoryView.hidden = true;
  quickPanelHistoryView.classList.remove("is-view-fading");
  quickPanelMainView.hidden = false;
  quickPanelMainView.classList.remove("is-view-fading");
}

export function shouldShowQuickPanelHistoryContent() {
  if (quickPanel?.classList.contains("is-open")) {
    return isHistoryViewActive();
  }
  return isQuickPanelPrefersHistoryView();
}
