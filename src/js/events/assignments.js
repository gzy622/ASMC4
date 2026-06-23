import {
  assignmentList,
  confirmCancelButton,
  confirmOkButton,
  deleteAssignmentButton,
  invertButton,
  newAssignmentCreateButton,
  newAssignmentInput,
  quickAssignmentList,
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
import { render } from "../render/index.js";
import { closeDrawer } from "../ui/drawer.js";
import { closeAllCenterPanels, openNewAssignmentPanel } from "../ui/panels.js";
import { closeConfirm, openConfirm } from "../ui/confirm.js";
import { announce } from "../utils/dom.js";

function selectAssignment(assignmentId) {
  getState().currentAssignmentId = assignmentId;
  saveAppState();
  render();
}

export function bindAssignmentEvents() {
  newAssignmentCreateButton.addEventListener("click", createAssignmentFromDialog);
  newAssignmentInput.addEventListener("keydown", event => {
    if (event.key === "Enter") createAssignmentFromDialog();
  });

  quickAssignmentList.addEventListener("click", event => {
    const chip = event.target.closest(".quick-chip");
    if (!chip) return;
    selectAssignment(chip.dataset.assignmentId);
    closeAllCenterPanels();
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
    selectAssignment(item.dataset.assignmentId);
    closeDrawer();
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
    selectAssignment(item.dataset.assignmentId);
    closeDrawer();
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
        announce("已反选提交状态");
      }
    });
  });

  deleteAssignmentButton.addEventListener("click", () => {
    const assignment = getCurrentAssignment();
    openConfirm({
      title: "删除当前作业",
      message: `确认删除“${assignment.title}”？该作业中的提交状态、分数和备注会一并删除。`,
      okText: "确认删除",
      danger: true,
      onConfirm: () => {
        deleteCurrentAssignment();
        closeConfirm();
        closeAllCenterPanels();
        announce("已删除当前作业");
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
      const trimmed = quickRenameInput.value.trim();
      const assignment = getCurrentAssignment();
      if (trimmed && trimmed !== assignment.title) {
        assignment.title = trimmed;
        assignment.updatedAt = new Date().toISOString();
        saveAppState();
        render();
        announce("已重命名为" + trimmed);
      }
    }
    function cancelRename() {
      if (renameSettled) return;
      renameSettled = true;
      render();
    }
    quickRenameInput.addEventListener("blur", () => {
      renameSettled = false;
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
      saveAppState();
      render();
      announce(assignment.subject ? `科目已设为${assignment.subject}` : "已清除科目");
    });
  }
}
