import { getState, getCurrentAssignment } from "../state.js";
import { titleNode } from "../dom-refs.js";
import { renderStudents } from "./students.js";
import { renderAssignmentList } from "./assignmentList.js";
import { renderSettingsState } from "./settings.js";
import { renderQuickAssignmentList } from "./quickPanel.js";
import { renderScoringMode } from "./scoringMode.js";
import { renderProgress } from "./progress.js";

export function render() {
  const state = getState();
  const assignment = getCurrentAssignment();
  titleNode.textContent = assignment.title;
  document.title = `${assignment.title} UI`;
  renderStudents(state, assignment);
  renderAssignmentList(state);
  renderSettingsState(state);
  renderQuickAssignmentList(state);
  renderScoringMode(state);
  renderProgress(state, assignment);
}
