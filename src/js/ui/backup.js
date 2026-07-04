import { saveAppState, getState, resetAssignmentHistories } from "../state.js";
import { scheduleRender } from "../render/index.js";
import { closeConfirm, openConfirm } from "./confirm.js";
import { closeDrawer } from "./drawer.js";
import { closeSettings } from "./settings.js";
import { normalizeAssignment, normalizeRosterFromBackup } from "../utils/normalize.js";
import { announce } from "../utils/dom.js";
import { importBackupInput, settingsPanel } from "../dom-refs.js";
import { isNativePlatform } from "../utils/native.js";
import { suspendBackGuard, resumeBackGuard } from "../utils/back-guard.js";
import { MAX_BACKUP_FILE_BYTES } from "../constants.js";
import { getAppStateLimitError } from "../utils/data-limits.js";

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
      .filter(function(entry) { return entry.nonEnglish; })
      .map(function(entry) { return { id: entry.id, serial: entry.serial, name: entry.name }; });
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

export function openImportBackupPicker() {
  suspendBackGuard();
  importBackupInput.click();
  window.addEventListener("focus", () => resumeBackGuard(), { once: true });
}

export function importBackup(file) {
  if (file.size > MAX_BACKUP_FILE_BYTES) {
    alert("备份文件过大，请先精简作业或名单后再导入。");
    importBackupInput.value = "";
    return;
  }

  const reader = new FileReader();
  reader.onload = function(event) {
    try {
      const data = JSON.parse(event.target.result);

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

            const nextState = {
              showRealNames: data.showRealNames !== false,
              scoringMode: Boolean(data.scoringMode),
              scoreStep10Mode: Boolean(data.scoreStep10Mode ?? data.scoreTensMode),
              showBarScoringToggle: data.showBarScoringToggle !== false,
              showBarStats: data.showBarStats !== false,
              hapticsEnabled: data.hapticsEnabled !== false,
              currentAssignmentId: currentAssignment.id,
              assignments,
              roster: normalizeRosterFromBackup(data, assignments[0].students)
            };

            const limitError = getAppStateLimitError(nextState);
            if (limitError) {
              alert(limitError);
              return;
            }

            const state = getState();
            state.showRealNames = nextState.showRealNames;
            state.scoringMode = nextState.scoringMode;
            state.scoreStep10Mode = nextState.scoreStep10Mode;
            state.showBarScoringToggle = nextState.showBarScoringToggle;
            state.showBarStats = nextState.showBarStats;
            state.hapticsEnabled = nextState.hapticsEnabled;
            state.currentAssignmentId = nextState.currentAssignmentId;
            state.assignments = nextState.assignments;
            state.roster = nextState.roster;

            resetAssignmentHistories();
            saveAppState({ history: false });
            scheduleRender();
            if (settingsPanel.classList.contains("is-open")) {
              void closeSettings();
            } else {
              closeDrawer();
            }
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
