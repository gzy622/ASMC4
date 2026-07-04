import { escapeHTML } from "../utils/escapeHTML.js";
import { getAssignmentStats } from "../state.js";
import { assignmentList, drawerSearchInput, drawerSubjectFilter } from "../dom-refs.js";

let renderedListKey = "";

function getFilteredAssignments(assignments) {
  const keyword = (drawerSearchInput?.value || "").trim().toLowerCase();
  const subject = drawerSubjectFilter?.value || "";

  return assignments.filter(assignment => {
    if (keyword && !assignment.title.toLowerCase().includes(keyword)) return false;
    if (subject && assignment.subject !== subject) return false;
    return true;
  });
}

function buildListKey(state) {
  const filtered = getFilteredAssignments(state.assignments);
  const keyword = (drawerSearchInput?.value || "").trim().toLowerCase();
  const subject = drawerSubjectFilter?.value || "";

  return [
    String(state.currentAssignmentId),
    keyword,
    subject,
    ...filtered.map(assignment => {
      const stats = getAssignmentStats(assignment);
      return `${assignment.id}:${assignment.title}:${assignment.subject}:${stats.submitted}:${stats.total}`;
    })
  ].join("|");
}

export function renderAssignmentList(state) {
  const listKey = buildListKey(state);
  if (listKey === renderedListKey) return;
  renderedListKey = listKey;

  const filtered = getFilteredAssignments(state.assignments);

  assignmentList.innerHTML = filtered.map(assignment => {
    const stats = getAssignmentStats(assignment);
    const activeClass = String(assignment.id) === String(state.currentAssignmentId) ? "is-active" : "";
    const safeId = escapeHTML(assignment.id);
    const safeTitle = escapeHTML(assignment.title);
    const subjectTag = assignment.subject
      ? `<span class="assignment-subject-tag">${escapeHTML(assignment.subject)}</span>`
      : "";

    return `
      <div
        class="assignment-item ${activeClass}"
        role="button"
        tabindex="0"
        data-assignment-id="${safeId}"
        aria-label="${safeTitle}，${stats.submitted}/${stats.total} 已交"
      >
        <div class="assignment-item-body">
          <span class="assignment-name" data-assignment-id="${safeId}">${safeTitle}</span>
          <span class="assignment-meta">${subjectTag}${stats.submitted}/${stats.total} 已交</span>
        </div>
        <div class="assignment-item-actions">
          <button class="assignment-item-action" data-action="edit" data-assignment-id="${safeId}" type="button" aria-label="编辑 ${safeTitle}"><svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M4 20h4l10-10a2.83 2.83 0 1 0-4-4L4 16v4z" stroke="currentColor" stroke-width="2" fill="none" stroke-linejoin="round"/><path d="M13.5 6.5l4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button>
          <button class="assignment-item-action danger" data-action="delete" data-assignment-id="${safeId}" type="button" aria-label="删除 ${safeTitle}">✕</button>
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
