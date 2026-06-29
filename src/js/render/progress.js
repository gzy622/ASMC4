import { getAssignmentStats } from "../state.js";
import { progressBar, barStats } from "../dom-refs.js";

export function renderProgress(state, assignment) {
  const stats = getAssignmentStats(assignment);
  const ratio = stats.total > 0 ? stats.submitted / stats.total : 0;
  progressBar.style.setProperty("--progress", String(ratio));
  progressBar.setAttribute("aria-valuenow", String(Math.round(ratio * 100)));
  if (barStats) {
    barStats.textContent = `${stats.submitted}/${stats.total}`;
    barStats.hidden = !(state.showBarStats !== false);
  }
}
