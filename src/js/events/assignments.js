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
import { getCurrentAssignment } from "../state.js";
import { pendingConfirmAction } from "../runtime.js";
import {
  createAssignmentFromDialog,
  deleteAssignmentFromDrawer,
  deleteCurrentAssignment,
  invertCurrentAssignmentSubmission,
  renameCurrentAssignmentTitle,
  selectAssignment,
  updateCurrentAssignmentSubject
} from "../business/assignment.js";
import { startDrawerAssignmentEdit } from "../ui/assignment-edit.js";
import { closeDrawer } from "../ui/drawer.js";
import { openNewAssignmentPanel, closeFloatingPanels } from "../ui/panels.js";
import { closeConfirm, openConfirm } from "../ui/confirm.js";
import { announce } from "../utils/dom.js";
import { traceEvent } from "../utils/trace.js";

function selectAssignmentFromDrawer(assignmentId) {
  selectAssignment(assignmentId);
  closeDrawer();
}

export function bindAssignmentEvents() {
  newAssignmentCreateButton.addEventListener("click", () => {
    traceEvent("assignment.create");
    createAssignmentFromDialog();
  });
  newAssignmentTitleInput.addEventListener("keydown", event => {
    if (event.key === "Enter") {
      traceEvent("assignment.create");
      createAssignmentFromDialog();
    }
  });

  assignmentList.addEventListener("click", event => {
    if (event.target.closest(".assignment-edit-input")) return;
    if (event.target.closest(".assignment-edit-subject")) return;

    if (event.target.closest(".assignment-item-add")) {
      openNewAssignmentPanel();
      return;
    }

    const actionButton = event.target.closest(".assignment-item-action");
    if (actionButton) {
      event.stopPropagation();
      const { action, assignmentId } = actionButton.dataset;
      if (action === "edit") {
        traceEvent("assignment.rename", { assignmentId: String(assignmentId) });
        startDrawerAssignmentEdit(assignmentId);
      }
      if (action === "delete") {
        traceEvent("assignment.delete", { assignmentId: String(assignmentId) });
        deleteAssignmentFromDrawer(assignmentId);
      }
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
      openNewAssignmentPanel();
      return;
    }

    const item = event.target.closest(".assignment-item");
    if (!item) return;
    event.preventDefault();
    selectAssignmentFromDrawer(item.dataset.assignmentId);
  });

  invertButton.addEventListener("click", () => {
    traceEvent("assignment.invert");
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
    traceEvent("assignment.deleteCurrent");
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
      const result = renameCurrentAssignmentTitle(quickRenameInput.value);
      if (result.title !== undefined) quickRenameInput.value = result.title;
    }
    function cancelRename() {
      if (renameSettled) return;
      renameSettled = true;
      quickRenameInput.value = getCurrentAssignment().title;
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
      updateCurrentAssignmentSubject(quickSubjectSelect.value);
    });
  }
}
