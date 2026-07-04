import {
  assignmentList,
  confirmCancelButton,
  confirmOkButton,
  deleteAssignmentButton,
  invertButton,
  newAssignmentCreateButton,
  newAssignmentTitleInput,
  quickRenameInput,
  quickSubjectSelect
} from "../dom-refs.js";
import { getCurrentAssignment, getState, saveAppState } from "../state.js";
import { pendingConfirmAction } from "../runtime.js";
import {
  createAssignmentFromDialog,
  deleteAssignmentFromDrawer,
  deleteCurrentAssignment,
  invertCurrentAssignmentSubmission,
  renameAssignment
} from "../business/assignment.js";
import { render, scheduleRender } from "../render/index.js";
import { closeDrawer } from "../ui/drawer.js";
import { openNewAssignmentPanel, closeFloatingPanels } from "../ui/panels.js";
import { closeConfirm, openConfirm } from "../ui/confirm.js";
import { announce } from "../utils/dom.js";
import { clampAssignmentTitle } from "../utils/data-limits.js";

function selectAssignment(assignmentId) {
  getState().currentAssignmentId = assignmentId;
  saveAppState({ history: false });
  render();
}

function selectAssignmentFromDrawer(assignmentId) {
  selectAssignment(assignmentId);
  closeDrawer({ withTransitionLock: false });
}

export function bindAssignmentEvents() {
  newAssignmentCreateButton.addEventListener("click", createAssignmentFromDialog);
  newAssignmentTitleInput.addEventListener("keydown", event => {
    if (event.key === "Enter") createAssignmentFromDialog();
  });

  assignmentList.addEventListener("click", event => {
    if (event.target.closest(".assignment-edit-input")) return;
    if (event.target.closest(".assignment-edit-subject")) return;

    if (event.target.closest(".assignment-item-add")) {
      closeDrawer();
      openNewAssignmentPanel();
      return;
    }

    const actionButton = event.target.closest(".assignment-item-action");
    if (actionButton) {
      event.stopPropagation();
      const { action, assignmentId } = actionButton.dataset;
      if (action === "edit") renameAssignment(assignmentId);
      if (action === "delete") deleteAssignmentFromDrawer(assignmentId);
      return;
    }

    const item = event.target.closest(".assignment-item");
    if (!item) return;
    selectAssignmentFromDrawer(item.dataset.assignmentId);
  });

  assignmentList.addEventListener("keydown", event => {
    if (event.key !== "Enter" && event.key !== " ") return;
    if (event.target.closest(".assignment-item-action")) return;
    if (event.target.closest(".assignment-edit-subject")) return;

    if (event.target.closest(".assignment-item-add")) {
      event.preventDefault();
      closeDrawer();
      openNewAssignmentPanel();
      return;
    }

    const item = event.target.closest(".assignment-item");
    if (!item) return;
    event.preventDefault();
    selectAssignmentFromDrawer(item.dataset.assignmentId);
  });

  invertButton.addEventListener("click", () => {
    const assignment = getCurrentAssignment();
    openConfirm({
      title: "反选提交状态",
      message: `确认反选“${assignment.title}”中所有学生的提交状态？无登记学生不会被改动。`,
      okText: "确认反选",
      danger: false,
      onConfirm: () => {
        invertCurrentAssignmentSubmission();
        closeConfirm();
        announce("已反选提交", { action: "undo" });
      }
    });
  });

  deleteAssignmentButton.addEventListener("click", () => {
    const assignment = getCurrentAssignment();
    const assignmentId = assignment.id;
    openConfirm({
      title: "删除当前作业",
      message: `确认删除“${assignment.title}”？该作业中的提交状态、分数和备注会一并删除。`,
      okText: "确认删除",
      danger: true,
      onConfirm: () => {
        deleteCurrentAssignment();
        closeConfirm();
        closeFloatingPanels();
        announce("已删除作业", { action: "undo", assignmentId });
      }
    });
  });

  confirmCancelButton.addEventListener("click", closeConfirm);
  confirmOkButton.addEventListener("click", () => {
    if (typeof pendingConfirmAction === "function") pendingConfirmAction();
  });

  if (quickRenameInput) {
    let renameSettled = false;
    function commitRename() {
      if (renameSettled) return;
      renameSettled = true;
      const trimmed = clampAssignmentTitle(quickRenameInput.value.trim());
      const assignment = getCurrentAssignment();
      if (!trimmed) {
        scheduleRender();
        return;
      }

      if (trimmed === assignment.title) {
        if (quickRenameInput.value !== assignment.title) scheduleRender();
        return;
      }

      assignment.title = trimmed;
      quickRenameInput.value = trimmed;
      assignment.updatedAt = new Date().toISOString();
      saveAppState({ label: `重命名为「${trimmed}」`, assignmentId: assignment.id });
      scheduleRender();
      announce("已重命名", { action: "undo", assignmentId: assignment.id });
    }
    function cancelRename() {
      if (renameSettled) return;
      renameSettled = true;
      scheduleRender();
    }
    quickRenameInput.addEventListener("blur", () => {
      commitRename();
    });
    quickRenameInput.addEventListener("keydown", e => {
      if (e.key === "Enter") {
        e.preventDefault();
        quickRenameInput.blur();
      } else if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        cancelRename();
      }
    });
    quickRenameInput.addEventListener("focus", () => {
      renameSettled = false;
    });
  }

  if (quickSubjectSelect) {
    quickSubjectSelect.addEventListener("change", () => {
      const assignment = getCurrentAssignment();
      assignment.subject = quickSubjectSelect.value;
      const subjectLabel = assignment.subject ? `修改科目为「${assignment.subject}」` : "清除科目";
      saveAppState({ label: subjectLabel, assignmentId: assignment.id });
      scheduleRender();
      announce(assignment.subject ? "科目已更新" : "科目已清除", { action: "undo", assignmentId: assignment.id });
    });
  }
}
