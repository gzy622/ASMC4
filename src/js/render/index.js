import { getState, getCurrentAssignment } from "../state.js";
import { assignmentTitleNode } from "../dom-refs.js";
import { renderStudents } from "./students.js";
import { renderAssignmentList } from "./assignmentList.js";
import { renderSettingsState } from "./settings.js";
import { refreshOpenQuickPanel } from "./quickPanel.js";
import { renderScoringMode } from "./scoringMode.js";
import { renderProgress } from "./progress.js";
import { syncScoreStep10Ui } from "../score-sheet/score-step10-ui.js";

let renderPending = false;

export function scheduleRender() {
  if (renderPending) return;
  renderPending = true;
  requestAnimationFrame(() => {
    renderPending = false;
    render();
  });
}

export function render() {
  const state = getState();
  const assignment = getCurrentAssignment();
  assignmentTitleNode.textContent = assignment.title;
  document.title = "ASMC4";
  renderStudents(state, assignment);
  renderAssignmentList(state);
  refreshOpenQuickPanel();
  renderSettingsState(state);
  renderScoringMode(state);
  syncScoreStep10Ui(state.scoreStep10Mode);
  renderProgress(state, assignment);
}
