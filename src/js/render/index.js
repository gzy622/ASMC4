import { getState, getCurrentAssignment } from "../state.js";
import { titleNode, quickPanel } from "../dom-refs.js";
import { renderStudents } from "./students.js";
import { renderAssignmentList } from "./assignmentList.js";
import { renderSettingsState } from "./settings.js";
import { renderQuickPanel, renderHistoryButtons, renderQuickPanelHeader } from "./quickPanel.js";
import { renderHistoryList } from "./history.js";
import { renderScoringMode } from "./scoringMode.js";
import { renderProgress } from "./progress.js";
import { syncScoreTensUi } from "../score-sheet/tens-ui.js";
import { isHistoryViewActive } from "../ui/history.js";

export function renderOpenQuickPanel() {
  if (!quickPanel.classList.contains("is-open")) return;

  const historyViewActive = isHistoryViewActive();
  renderQuickPanelHeader(historyViewActive);
  if (historyViewActive) {
    renderHistoryList();
  } else {
    renderQuickPanel();
  }
}

export function render() {
  const state = getState();
  const assignment = getCurrentAssignment();
  titleNode.textContent = assignment.title;
  document.title = "ASMC4";
  renderStudents(state, assignment);
  renderAssignmentList(state);
  renderOpenQuickPanel();
  renderSettingsState(state);
  renderScoringMode(state);
  syncScoreTensUi(state.scoreTensMode);
  renderProgress(state, assignment);
  renderHistoryButtons();
}
