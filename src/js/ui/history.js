import { quickPanelMainView, quickPanelHistoryView, quickPanelBody } from "../dom-refs.js";

const FADE_DURATION = 180;
const HEIGHT_DURATION = 280;

let switching = false;

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
  if (switching || toEl.hidden === false) return;
  switching = true;

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
  switching = false;
}

export function switchToHistoryView() {
  lockHistoryViewHeight();
  return switchView(quickPanelMainView, quickPanelHistoryView);
}

export function switchToMainView() {
  return switchView(quickPanelHistoryView, quickPanelMainView)
    .finally(clearHistoryViewHeight);
}

export function resetQuickPanelView() {
  clearQuickPanelBodySwitchingState();
  clearHistoryViewHeight();

  quickPanelHistoryView.hidden = true;
  quickPanelHistoryView.classList.remove("is-view-fading");

  quickPanelMainView.hidden = false;
  quickPanelMainView.classList.remove("is-view-fading");

  switching = false;
}

export function isHistoryViewActive() {
  return !quickPanelHistoryView.hidden;
}
