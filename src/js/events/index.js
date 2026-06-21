import { getState, saveAppState, getCurrentAssignment } from "../state.js";
import { STATUS } from "../constants.js";
import { pendingConfirmAction, suppressNextCardClick, setSuppressNextCardClick, longPressTriggered, setLongPressTriggered, scoreTensMode, scoreInputValue, setScoreInputValue, noteInputValue, setNoteInputValue, longPressTimer } from "../runtime.js";
import { menuButton, drawerCloseButton, drawerScrim, settingsButton, addButton, newAssignmentCloseButton, newAssignmentCancelButton, newAssignmentCreateButton, titleButton, quickPanelCloseButton, quickAssignmentList, modalScrim, assignmentList, grid, hideNameSwitch, invertButton, deleteAssignmentButton, confirmCancelButton, confirmOkButton, scoreCancel, scoreConfirm, scoreSheetScrim, scoreSheet, exportBackupBtn, importBackupBtn, importBackupInput, scoreNoteInput, scoreNoteClear, scoreNumpad, newAssignmentInput, newAssignmentPanel, quickPanel, drawer, confirmPanel } from "../dom-refs.js";
import { openDrawer, closeDrawer } from "../ui/drawer.js";
import { openNewAssignmentPanel, closeAllCenterPanels, openQuickPanel } from "../ui/panels.js";
import { openConfirm, closeConfirm } from "../ui/confirm.js";
import { exportBackup, importBackup } from "../ui/backup.js";
import { createAssignmentFromDialog, invertCurrentAssignmentSubmission, deleteCurrentAssignment, deleteAssignmentFromDrawer, renameAssignment } from "../business/assignment.js";
import { toggleStudent, toggleScoringMode } from "../business/student.js";
import { openScoreSheet, closeScoreSheet, confirmScore, toggleTensMode, updateScoreDisplay } from "../score-sheet/index.js";
import { handleLongPressStart, handleLongPressEnd } from "../score-sheet/longpress.js";
import { render } from "../render/index.js";
import { announce } from "../utils/dom.js";
import "../gestures/score-swipe.js";
import "../gestures/drawer-gestures.js";

menuButton.addEventListener("click", openDrawer);
drawerCloseButton.addEventListener("click", closeDrawer);
drawerScrim.addEventListener("click", closeDrawer);

settingsButton.addEventListener("click", toggleScoringMode);

addButton.addEventListener("click", openNewAssignmentPanel);
newAssignmentCloseButton.addEventListener("click", closeAllCenterPanels);
newAssignmentCancelButton.addEventListener("click", closeAllCenterPanels);
newAssignmentCreateButton.addEventListener("click", createAssignmentFromDialog);

titleButton.addEventListener("click", openQuickPanel);
titleButton.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    openQuickPanel();
  }
});
quickPanelCloseButton.addEventListener("click", closeAllCenterPanels);

quickAssignmentList.addEventListener("click", (event) => {
  const chip = event.target.closest(".quick-chip");
  if (!chip) return;

  getState().currentAssignmentId = chip.dataset.assignmentId;
  saveAppState();
  render();
  closeAllCenterPanels();
});

modalScrim.addEventListener("click", () => {
  if (confirmPanel.classList.contains("is-open")) return;
  closeAllCenterPanels();
});

assignmentList.addEventListener("click", (event) => {
  if (event.target.closest(".assignment-edit-input")) return;

  if (event.target.closest(".assignment-item-add")) {
    closeDrawer();
    openNewAssignmentPanel();
    return;
  }

  const actionBtn = event.target.closest(".assignment-item-action");
  if (actionBtn) {
    event.stopPropagation();
    const action = actionBtn.dataset.action;
    const assignmentId = actionBtn.dataset.assignmentId;
    if (action === "edit") {
      renameAssignment(assignmentId);
    } else if (action === "delete") {
      deleteAssignmentFromDrawer(assignmentId);
    }
    return;
  }

  const item = event.target.closest(".assignment-item");
  if (!item) return;

  getState().currentAssignmentId = item.dataset.assignmentId;
  saveAppState();
  render();
  closeDrawer();
});

assignmentList.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    const actionBtn = event.target.closest(".assignment-item-action");
    if (actionBtn) return;

    if (event.target.closest(".assignment-item-add")) {
      event.preventDefault();
      closeDrawer();
      openNewAssignmentPanel();
      return;
    }

    const item = event.target.closest(".assignment-item");
    if (!item) return;
    event.preventDefault();
    getState().currentAssignmentId = item.dataset.assignmentId;
    saveAppState();
    render();
    closeDrawer();
  }
});

grid.addEventListener("click", (event) => {
  const card = event.target.closest(".student-card");
  if (!card) return;

  if (suppressNextCardClick) {
    setSuppressNextCardClick(false);
    return;
  }

  if (longPressTriggered) {
    setLongPressTriggered(false);
    return;
  }

  const assignment = getCurrentAssignment();
  const student = assignment.students.find(item => String(item.id) === card.dataset.id);
  if (!student || student.status === STATUS.NONE) return;

  if (getState().scoringMode) {
    openScoreSheet(student);
  } else {
    toggleStudent(student);
  }
});

hideNameSwitch.addEventListener("click", () => {
  const state = getState();
  state.hideNames = !state.hideNames;
  saveAppState();
  render();
  announce(state.hideNames ? "已隐藏真实姓名" : "已显示真实姓名");
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
  if (typeof pendingConfirmAction === "function") {
    pendingConfirmAction();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;

  if (confirmPanel.classList.contains("is-open")) {
    closeConfirm();
    return;
  }

  if (scoreSheet.classList.contains("is-open")) {
    closeScoreSheet();
    return;
  }

  if (newAssignmentPanel.classList.contains("is-open") || quickPanel.classList.contains("is-open")) {
    closeAllCenterPanels();
    return;
  }

  if (drawer.classList.contains("is-open")) {
    closeDrawer();
  }
});

newAssignmentInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    createAssignmentFromDialog();
  }
});

scoreCancel.addEventListener("click", closeScoreSheet);
scoreConfirm.addEventListener("click", confirmScore);
scoreSheetScrim.addEventListener("click", closeScoreSheet);

exportBackupBtn.addEventListener("click", exportBackup);

importBackupBtn.addEventListener("click", () => {
  importBackupInput.click();
});

importBackupInput.addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (!file) return;
  importBackup(file);
  importBackupInput.value = "";
});

scoreNoteInput.addEventListener("input", () => {
  setNoteInputValue(scoreNoteInput.value);
  scoreNoteClear.classList.toggle("is-visible", noteInputValue.length > 0);
});

scoreNoteClear.addEventListener("click", () => {
  scoreNoteInput.value = "";
  setNoteInputValue("");
  scoreNoteClear.classList.remove("is-visible");
  scoreNoteInput.focus();
});

scoreNumpad.addEventListener("click", (event) => {
  const btn = event.target.closest(".numpad-btn");
  if (!btn) return;

  const value = btn.dataset.value;
  const action = btn.dataset.action;

  if (value !== undefined) {
    if (scoreTensMode) {
      setScoreInputValue(value === "0" ? "100" : String(parseInt(value, 10) * 10));
    } else {
      if (scoreInputValue === "0") {
        setScoreInputValue(value);
      } else if (scoreInputValue.length < 3) {
        setScoreInputValue(scoreInputValue + value);
      }
      const num = parseInt(scoreInputValue, 10);
      if (num > 999) setScoreInputValue("999");
    }
  } else if (action === "backspace") {
    if (scoreInputValue.length > 1) {
      setScoreInputValue(scoreInputValue.slice(0, -1));
    } else {
      setScoreInputValue("0");
    }
  } else if (action === "tens") {
    toggleTensMode();
  }

  updateScoreDisplay();
});

grid.addEventListener("touchstart", handleLongPressStart, { passive: true });
grid.addEventListener("touchend", handleLongPressEnd);
grid.addEventListener("touchcancel", handleLongPressEnd);
grid.addEventListener("mousedown", handleLongPressStart);
grid.addEventListener("mouseup", handleLongPressEnd);
grid.addEventListener("mouseleave", handleLongPressEnd);
grid.addEventListener("contextmenu", (event) => {
  if (longPressTimer) event.preventDefault();
});
