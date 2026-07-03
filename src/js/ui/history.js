import { quickPanelMainView, quickPanelHistoryView } from "../dom-refs.js";

export function showHistoryView() {
  quickPanelMainView.hidden = true;
  quickPanelHistoryView.hidden = false;
}

export function showQuickPanelMainView() {
  quickPanelHistoryView.hidden = true;
  quickPanelMainView.hidden = false;
}

export function isHistoryViewActive() {
  return !quickPanelHistoryView.hidden;
}
