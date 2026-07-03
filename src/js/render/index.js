import { getState, getCurrentAssignment } from "../state.js";
import { titleNode } from "../dom-refs.js";
import { renderStudents } from "./students.js";
import { renderAssignmentList } from "./assignmentList.js";
import { renderSettingsState } from "./settings.js";
import { refreshOpenQuickPanel } from "./quickPanel.js";
import { renderScoringMode } from "./scoringMode.js";
import { renderProgress } from "./progress.js";
import { syncScoreTensUi } from "../score-sheet/tens-ui.js";

export function render() {
  const state = getState();
  const assignment = getCurrentAssignment();
  titleNode.textContent = assignment.title;
  document.title = "ASMC4";
  renderStudents(state, assignment);
  renderAssignmentList(state);
  refreshOpenQuickPanel();
  renderSettingsState(state);
  renderScoringMode(state);
  syncScoreTensUi(state.scoreTensMode);
  renderProgress(state, assignment);
}
