import { getState } from "../state.js";
import { defaultStudents } from "../data/defaults.js";
import { render } from "../render/index.js";
import { applyRosterToAllAssignments } from "../business/roster.js";
import { openConfirm, closeConfirm } from "./confirm.js";
import { announce } from "../utils/dom.js";
import { escapeHTML } from "../utils/escapeHTML.js";
import { normalizeRosterEntry } from "../utils/normalize.js";
import { MAX_ROSTER_SIZE } from "../constants.js";
import {
  rosterEditorPanel,
  rosterEditorList
} from "../dom-refs.js";
import { closeDrawerFullscreenPanel } from "./drawer-fullscreen.js";
import { clampStudentName } from "../utils/data-limits.js";

export async function closeRosterEditor() {
  return closeDrawerFullscreenPanel(rosterEditorPanel);
}

export function renderRosterRows(roster) {
  rosterEditorList.innerHTML = roster.map((entry, index) => {
    const serial = String(index + 1).padStart(2, "0");
    const safeId = escapeHTML(entry.id);
    const nonEnglishChecked = entry.nonEnglish ? "checked" : "";
    return `
      <div class="roster-row" data-id="${safeId}">
        <span class="roster-row-handle">&#x2261; ${serial}</span>
        <input class="roster-row-input roster-row-name" type="text" value="${escapeHTML(entry.name)}" placeholder="姓名" maxlength="10" />
        <label class="roster-row-nonenglish">
          <input class="roster-row-nonenglish-input" type="checkbox" data-action="toggle-nonenglish" ${nonEnglishChecked} />
          <span>非英语</span>
        </label>
        <button class="roster-row-btn danger" data-action="delete" type="button" aria-label="删除">&#10005;</button>
      </div>
    `;
  }).join("") + `
    <button class="roster-add-row" id="rosterAddBtn" type="button">+ 添加学生</button>
  `;
}

export function addEmptyRow() {
  const addBtn = rosterEditorList.querySelector(".roster-add-row");
  const existingRows = rosterEditorList.querySelectorAll(".roster-row");
  if (existingRows.length >= MAX_ROSTER_SIZE) {
    announce(`最多只能保留 ${MAX_ROSTER_SIZE} 名学生`);
    return;
  }
  const lastDomId = existingRows.length > 0
    ? Math.max(...Array.from(existingRows).map(r => Number(r.dataset.id)))
    : 0;
  const newId = lastDomId + 1;
  const newIndex = existingRows.length;

  const row = document.createElement("div");
  row.className = "roster-row";
  row.dataset.id = newId;
  row.innerHTML = `
    <span class="roster-row-handle">&#x2261; ${String(newIndex + 1).padStart(2, "0")}</span>
    <input class="roster-row-input roster-row-name" type="text" value="" placeholder="姓名" maxlength="10" />
    <label class="roster-row-nonenglish">
      <input class="roster-row-nonenglish-input" type="checkbox" data-action="toggle-nonenglish" />
      <span>非英语</span>
    </label>
    <button class="roster-row-btn danger" data-action="delete" type="button" aria-label="删除">&#10005;</button>
  `;

  rosterEditorList.insertBefore(row, addBtn);
  const input = row.querySelector(".roster-row-name");
  requestAnimationFrame(() => input.focus());
}

export function removeRow(rowEl) {
  const rows = rosterEditorList.querySelectorAll(".roster-row");
  if (rows.length <= 1) {
    announce("至少保留一名学生");
    return;
  }
  rowEl.remove();
  refreshRowIndices();
}

function refreshRowIndices() {
  const rows = rosterEditorList.querySelectorAll(".roster-row");
  rows.forEach((row, i) => {
    const serial = String(i + 1).padStart(2, "0");
    const handle = row.querySelector(".roster-row-handle");
    if (handle) handle.textContent = `≡ ${serial}`;
  });
}

export function setupDragHandlers() {
  let dragState = null;

  rosterEditorList.addEventListener("pointerdown", e => {
    const handle = e.target.closest(".roster-row-handle");
    if (!handle) return;
    const row = handle.closest(".roster-row");
    if (!row) return;

    dragState = { row };
    row.classList.add("dragging");
    row.setPointerCapture(e.pointerId);
    e.preventDefault();
  });

  rosterEditorList.addEventListener("pointermove", e => {
    if (!dragState) return;
    e.preventDefault();

    const targets = document.elementsFromPoint(e.clientX, e.clientY);
    const targetRow = targets.find(el => el.classList?.contains("roster-row"));

    document.querySelectorAll(".roster-row.drag-over-top, .roster-row.drag-over-bottom")
      .forEach(el => el.classList.remove("drag-over-top", "drag-over-bottom"));

    if (!targetRow || targetRow === dragState.row) {
      dragState.targetRow = null;
      return;
    }

    const rect = targetRow.getBoundingClientRect();
    const after = e.clientY > rect.top + rect.height / 2;

    targetRow.classList.add(after ? "drag-over-bottom" : "drag-over-top");
    dragState.targetRow = targetRow;
    dragState.after = after;
  });

  rosterEditorList.addEventListener("pointerup", e => {
    if (!dragState) return;
    e.preventDefault();

    dragState.row.classList.remove("dragging");

    document.querySelectorAll(".roster-row.drag-over-top, .roster-row.drag-over-bottom")
      .forEach(el => el.classList.remove("drag-over-top", "drag-over-bottom"));

    if (dragState.targetRow) {
      const { row, targetRow, after } = dragState;
      if (after) {
        targetRow.parentNode.insertBefore(row, targetRow.nextElementSibling);
      } else {
        targetRow.parentNode.insertBefore(row, targetRow);
      }
      refreshRowIndices();
    }
    dragState = null;
  });

  rosterEditorList.addEventListener("pointercancel", () => {
    if (!dragState) return;
    dragState.row.classList.remove("dragging");
    document.querySelectorAll(".roster-row.drag-over-top, .roster-row.drag-over-bottom")
      .forEach(el => el.classList.remove("drag-over-top", "drag-over-bottom"));
    dragState = null;
  });
}

export function collectRosterFromEditor() {
  const rows = rosterEditorList.querySelectorAll(".roster-row");
  const roster = [];
  let hasEmptyName = false;

  rows.forEach((row, i) => {
    const id = Number(row.dataset.id) || i + 1;
    const nameInput = row.querySelector(".roster-row-name");
    const name = clampStudentName(nameInput.value.trim());
    const nonEnglishInput = row.querySelector(".roster-row-nonenglish-input");

    if (!name) {
      nameInput.focus();
      nameInput.style.borderColor = "#e11d48";
      hasEmptyName = true;
      return;
    }
    nameInput.style.borderColor = "";
    nameInput.value = name;

    roster.push({
      id: id,
      serial: String(i + 1).padStart(2, "0"),
      name: name,
      nonEnglish: Boolean(nonEnglishInput && nonEnglishInput.checked)
    });
  });

  if (hasEmptyName) {
    announce("请填写姓名");
    return null;
  }

  return roster.map(normalizeRosterEntry);
}

export function saveRoster() {
  const roster = collectRosterFromEditor();
  if (!roster) return;

  applyRosterToAllAssignments(roster);
  render();
  closeRosterEditor();
  announce("名单已更新");
}

export function resetRoster() {
  openConfirm({
    title: "重置名单",
    message: "确认将学生名单重置为默认 50 人？所有作业中新增的学生将被删除，已有姓名字段将被覆盖。",
    okText: "重置",
    danger: true,
    onConfirm: () => {
      const defaultRoster = defaultStudents.map(s => ({
        id: s.id,
        serial: s.serial,
        name: s.name,
        nonEnglish: false
      }));
      applyRosterToAllAssignments(defaultRoster);
      render();
      closeRosterEditor();
      closeConfirm();
      announce("名单已重置");
    }
  });
}
