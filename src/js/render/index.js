import { getState, getCurrentAssignment } from "../state.js";
import { assignmentTitleNode } from "../dom-refs.js";
import { renderStudents } from "./students.js";
import { renderAssignmentList } from "./assignmentList.js";
import { renderSettingsState } from "./settings.js";
import { refreshOpenQuickPanel } from "./quickPanel.js";
import { renderScoringMode } from "./scoringMode.js";
import { renderProgress } from "./progress.js";
import { syncScoreStep10Ui } from "../score-sheet/score-step10-ui.js";
import { traceStep } from "../utils/trace.js";

let renderPending = false;

export function scheduleRender() {
  if (renderPending) {
    traceStep("scheduleRender", { skipped: true });
    return;
  }
  traceStep("scheduleRender", { scheduled: true });
  renderPending = true;
  requestAnimationFrame(() => {
    renderPending = false;
    render();
  });
}

export function render() {
  const modules = [];
  const state = getState();
  const assignment = getCurrentAssignment();
  assignmentTitleNode.textContent = assignment.title;
  document.title = "ASMC4";
  modules.push("title");
  renderStudents(state, assignment);
  modules.push("students");
  renderAssignmentList(state);
  modules.push("assignmentList");
  refreshOpenQuickPanel();
  modules.push("quickPanel");
  renderSettingsState(state);
  modules.push("settings");
  renderScoringMode(state);
  modules.push("scoringMode");
  syncScoreStep10Ui(state.scoreStep10Mode);
  modules.push("scoreStep10Ui");
  renderProgress(state, assignment);
  modules.push("progress");
  traceStep("render", { scheduled: false, modules });
}
