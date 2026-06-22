import { getState } from "../state.js";
import { defaultStudents } from "../data/defaults.js";
import { render } from "../render/index.js";
import { applyRosterToAllAssignments } from "../business/roster.js";
import { openConfirm, closeConfirm } from "./confirm.js";
import { closeScoreSheet } from "../score-sheet/index.js";
import { closeDrawer } from "./drawer.js";
import { closeAllCenterPanels } from "./panels.js";
import { announce } from "../utils/dom.js";
import { escapeHTML } from "../utils/escapeHTML.js";
import { normalizeRosterEntry } from "../utils/normalize.js";
import {
  rosterEditorPanel,
  rosterEditorList
} from "../dom-refs.js";

export function openRosterEditor() {
  closeScoreSheet();
  closeDrawer();
  closeAllCenterPanels();

  const state = getState();
  renderRosterRows(state.roster);

  rosterEditorPanel.classList.add("is-open");
  rosterEditorPanel.setAttribute("aria-hidden", "false");
}

export function closeRosterEditor() {
  rosterEditorPanel.classList.remove("is-open");
  rosterEditorPanel.setAttribute("aria-hidden", "true");
}

export function renderRosterRows(roster) {
  rosterEditorList.innerHTML = roster.map((entry, index) => {
    const serial = String(index + 1).padStart(2, "0");
    const nonEnglishChecked = entry.nonEnglish ? "checked" : "";
    return `
      <div class="roster-row" data-id="${entry.id}">
        <span class="roster-row-index">${serial}</span>
        <input class="roster-row-input roster-row-name" type="text" value="${escapeHTML(entry.name)}" placeholder="姓名" maxlength="10" />
        <label class="roster-row-nonenglish">
          <input class="roster-row-nonenglish-input" type="checkbox" data-action="toggle-nonenglish" ${nonEnglishChecked} />
          <span>非英语</span>
        </label>
        <button class="roster-row-btn" data-action="move-up" type="button" aria-label="上移" ${index === 0 ? "disabled" : ""}>&#9650;</button>
        <button class="roster-row-btn" data-action="move-down" type="button" aria-label="下移" ${index === roster.length - 1 ? "disabled" : ""}>&#9660;</button>
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
  const lastDomId = existingRows.length > 0
    ? Math.max(...Array.from(existingRows).map(r => Number(r.dataset.id)))
    : 0;
  const newId = lastDomId + 1;
  const newIndex = existingRows.length;

  const row = document.createElement("div");
  row.className = "roster-row";
  row.dataset.id = newId;
  row.innerHTML = `
    <span class="roster-row-index">${String(newIndex + 1).padStart(2, "0")}</span>
    <input class="roster-row-input roster-row-name" type="text" value="" placeholder="姓名" maxlength="10" />
    <label class="roster-row-nonenglish">
      <input class="roster-row-nonenglish-input" type="checkbox" data-action="toggle-nonenglish" />
      <span>非英语</span>
    </label>
    <button class="roster-row-btn" data-action="move-up" type="button" aria-label="上移" disabled>&#9650;</button>
    <button class="roster-row-btn" data-action="move-down" type="button" aria-label="下移" disabled>&#9660;</button>
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

export function moveRow(rowEl, direction) {
  const target = direction === "up" ? rowEl.previousElementSibling : rowEl.nextElementSibling;
  if (!target || target.classList.contains("roster-add-row")) return;

  if (direction === "up") {
    rowEl.parentNode.insertBefore(rowEl, target);
  } else {
    rowEl.parentNode.insertBefore(target, rowEl);
  }
  refreshRowIndices();
}

function refreshRowIndices() {
  const rows = rosterEditorList.querySelectorAll(".roster-row");
  rows.forEach((row, i) => {
    const serial = String(i + 1).padStart(2, "0");
    row.querySelector(".roster-row-index").textContent = serial;
    const upBtn = row.querySelector('[data-action="move-up"]');
    const downBtn = row.querySelector('[data-action="move-down"]');
    upBtn.disabled = i === 0;
    downBtn.disabled = i === rows.length - 1;
  });
}

export function collectRosterFromEditor() {
  const rows = rosterEditorList.querySelectorAll(".roster-row");
  const roster = [];
  let hasEmptyName = false;

  rows.forEach((row, i) => {
    const id = Number(row.dataset.id) || i + 1;
    const nameInput = row.querySelector(".roster-row-name");
    const name = nameInput.value.trim();
    const nonEnglishInput = row.querySelector(".roster-row-nonenglish-input");

    if (!name) {
      nameInput.focus();
      nameInput.style.borderColor = "#e11d48";
      hasEmptyName = true;
      return;
    }
    nameInput.style.borderColor = "";

    roster.push({
      id: id,
      serial: String(i + 1).padStart(2, "0"),
      name: name,
      nonEnglish: Boolean(nonEnglishInput && nonEnglishInput.checked)
    });
  });

  if (hasEmptyName) {
    announce("请填写所有学生姓名");
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
      announce("名单已重置为默认 50 人");
    }
  });
}
