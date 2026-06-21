import { escapeHTML } from "../utils/escapeHTML.js";
import { getAssignmentStats } from "../state.js";
import { assignmentList } from "../dom-refs.js";

export function renderAssignmentList(state) {
  assignmentList.innerHTML = state.assignments.map(assignment => {
    const stats = getAssignmentStats(assignment);
    const activeClass = assignment.id === state.currentAssignmentId ? "is-active" : "";

    return `
      <div
        class="assignment-item ${activeClass}"
        role="button"
        tabindex="0"
        data-assignment-id="${assignment.id}"
        aria-label="${escapeHTML(assignment.title)}，${stats.submitted}/${stats.total} 已交"
      >
        <div class="assignment-item-body">
          <span class="assignment-name" data-assignment-id="${assignment.id}">${escapeHTML(assignment.title)}</span>
          <span class="assignment-meta">${stats.submitted}/${stats.total} 已交 · ${stats.pending} 未交</span>
        </div>
        <div class="assignment-item-actions">
          <button class="assignment-item-action" data-action="edit" data-assignment-id="${assignment.id}" type="button" aria-label="编辑 ${escapeHTML(assignment.title)}">✎</button>
          <button class="assignment-item-action danger" data-action="delete" data-assignment-id="${assignment.id}" type="button" aria-label="删除 ${escapeHTML(assignment.title)}">✕</button>
        </div>
      </div>
    `;
  }).join("") + `
    <div class="assignment-item-add" role="button" tabindex="0" aria-label="新建作业">
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.2" stroke-linecap="square"/>
      </svg>
      <span style="font-size:15px;font-weight:600;">新建作业</span>
    </div>
  `;
}
