import { saveAppState, getState } from "../state.js";
import { render } from "../render/index.js";
import { openConfirm } from "./confirm.js";
import { closeDrawer } from "./drawer.js";
import { normalizeAssignment } from "../utils/normalize.js";
import { announce } from "../utils/dom.js";
import { importBackupInput } from "../dom-refs.js";

export function exportBackup() {
  try {
    const state = getState();
    const json = JSON.stringify(state, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const now = new Date();
    const ts = now.getFullYear()
      + String(now.getMonth() + 1).padStart(2, "0")
      + String(now.getDate()).padStart(2, "0") + "_"
      + String(now.getHours()).padStart(2, "0")
      + String(now.getMinutes()).padStart(2, "0")
      + String(now.getSeconds()).padStart(2, "0");
    a.href = url;
    a.download = `homework_backup_${ts}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    alert("导出失败：" + error.message);
  }
}

export function importBackup(file) {
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = JSON.parse(e.target.result);

      if (!data || !Array.isArray(data.assignments)) {
        alert("备份文件格式无效：缺少 assignments 数组");
        return;
      }

      openConfirm({
        title: "导入备份",
        message: "当前所有数据将被覆盖，确定导入此备份吗？",
        okText: "导入",
        danger: true,
        onConfirm: function() {
          try {
            const assignments = data.assignments
              .filter(function(item) { return item && Array.isArray(item.students); })
              .map(normalizeAssignment);

            if (assignments.length === 0) {
              alert("备份文件中没有有效的作业数据");
              return;
            }

            const currentAssignmentId = assignments.some(function(item) {
              return item.id === data.currentAssignmentId;
            }) ? data.currentAssignmentId : assignments[0].id;

            const state = getState();
            state.hideNames = Boolean(data.hideNames);
            state.scoringMode = Boolean(data.scoringMode);
            state.currentAssignmentId = currentAssignmentId;
            state.assignments = assignments;

            saveAppState();
            render();
            closeDrawer();
            announce("备份已导入");
          } catch (err) {
            alert("导入失败：" + err.message);
          }
        }
      });
    } catch (error) {
      alert("无法解析备份文件：" + error.message);
    }
  };
  reader.readAsText(file);
}
