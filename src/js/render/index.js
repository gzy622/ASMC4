import { getState, getCurrentAssignment } from "../state.js";
import { titleNode, drawer, quickPanel, assignmentList } from "../dom-refs.js";
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
  document.title = "ASMC4";
  renderStudents(state, assignment);
  if (drawer.classList.contains("is-open") || assignmentList.children.length === 0) {
    renderAssignmentList(state);
  }
  if (quickPanel.classList.contains("is-open")) {
    renderQuickAssignmentList(state);
  }
  renderSettingsState(state);
  renderScoringMode(state);
  renderProgress(state, assignment);
}
