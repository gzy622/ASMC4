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
  const height = quickPanelBody.scrollHeight;
  fromEl.hidden = originalFromHidden;
  toEl.hidden = originalToHidden;
  return height;
}

async function switchView(fromEl, toEl) {
  if (switching || toEl.hidden === false) return;
  switching = true;

  const startHeight = quickPanelBody.getBoundingClientRect().height;
  const endHeight = measureHeightWithView(fromEl, toEl);

  quickPanelBody.classList.add("is-view-switching");
  quickPanelBody.style.height = `${startHeight}px`;
  void quickPanelBody.offsetHeight;

  fromEl.classList.add("is-view-fading");

  requestAnimationFrame(() => {
    quickPanelBody.style.transition = `height ${HEIGHT_DURATION}ms var(--motion)`;
    quickPanelBody.style.height = `${endHeight}px`;
  });

  await wait(FADE_DURATION);

  fromEl.hidden = true;
  fromEl.classList.remove("is-view-fading");

  toEl.hidden = false;
  toEl.classList.add("is-view-fading");
  void toEl.offsetHeight;
  toEl.classList.remove("is-view-fading");

  await wait(Math.max(0, HEIGHT_DURATION - FADE_DURATION));

  quickPanelBody.style.height = "";
  quickPanelBody.style.transition = "";
  quickPanelBody.classList.remove("is-view-switching");
  switching = false;
}

export function switchToHistoryView() {
  return switchView(quickPanelMainView, quickPanelHistoryView);
}

export function switchToMainView() {
  return switchView(quickPanelHistoryView, quickPanelMainView);
}

export function resetQuickPanelView() {
  quickPanelBody.style.height = "";
  quickPanelBody.style.transition = "";
  quickPanelBody.classList.remove("is-view-switching");

  quickPanelHistoryView.hidden = true;
  quickPanelHistoryView.classList.remove("is-view-fading");

  quickPanelMainView.hidden = false;
  quickPanelMainView.classList.remove("is-view-fading");

  switching = false;
}

export function isHistoryViewActive() {
  return !quickPanelHistoryView.hidden;
}
