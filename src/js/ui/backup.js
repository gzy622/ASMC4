import { saveAppState, getState } from "../state.js";
import { render } from "../render/index.js";
import { closeConfirm, openConfirm } from "./confirm.js";
import { closeDrawer } from "./drawer.js";
import { normalizeAssignment, normalizeRosterFromBackup } from "../utils/normalize.js";
import { announce } from "../utils/dom.js";
import { importBackupInput } from "../dom-refs.js";
import { isNativePlatform } from "../utils/native.js";

function timestampName() {
  const now = new Date();
  const ts = now.getFullYear()
    + String(now.getMonth() + 1).padStart(2, "0")
    + String(now.getDate()).padStart(2, "0") + "_"
    + String(now.getHours()).padStart(2, "0")
    + String(now.getMinutes()).padStart(2, "0")
    + String(now.getSeconds()).padStart(2, "0");
  return `homework_backup_${ts}.json`;
}

export async function exportBackup() {
  try {
    const state = getState();
    const nonEnglishStudents = state.roster
      .filter(function(e) { return e.nonEnglish; })
      .map(function(e) { return { id: e.id, serial: e.serial, name: e.name }; });
    const backupData = Object.assign({}, state, { nonEnglishStudents: nonEnglishStudents });
    const json = JSON.stringify(backupData, null, 2);
    const fileName = timestampName();

    if (isNativePlatform()) {
      const { Filesystem, Directory, Encoding } = await import("@capacitor/filesystem");
      const { Share } = await import("@capacitor/share");
      const result = await Filesystem.writeFile({
        path: fileName,
        data: json,
        directory: Directory.Cache,
        encoding: Encoding.UTF8
      });
      await Share.share({
        title: "导出作业备份",
        files: [result.uri],
        dialogTitle: "分享备份文件"
      });
    } else {
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  } catch (error) {
    if (error.message && (error.message.includes("cancel") || error.message.includes("abort"))) return;
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

            const currentAssignment = assignments.find(function(item) {
              return String(item.id) === String(data.currentAssignmentId);
            }) || assignments[0];

            const state = getState();
            state.showRealNames = data.showRealNames !== false;
            state.scoringMode = Boolean(data.scoringMode);
            state.scoreTensMode = Boolean(data.scoreTensMode);
            state.showBarScoringToggle = data.showBarScoringToggle !== false;
            state.showBarStats = data.showBarStats !== false;
            state.hapticsEnabled = data.hapticsEnabled !== false;
            state.currentAssignmentId = currentAssignment.id;
            state.assignments = assignments;
            state.roster = normalizeRosterFromBackup(data, assignments[0].students);

            saveAppState({ history: false });
            render();
            closeDrawer();
            closeConfirm();
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
