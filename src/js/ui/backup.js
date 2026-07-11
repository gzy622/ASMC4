import { getState, replaceAppStateFromBackup } from "../state.js";
import { scheduleRender } from "../render/index.js";
import { closeConfirm, openConfirm } from "./confirm.js";
import { closeDrawer } from "./drawer.js";
import { closeSettings } from "./settings.js";
import { announce } from "../utils/dom.js";
import { importBackupInput, settingsPanel } from "../dom-refs.js";
import { isNativePlatform } from "../utils/native.js";
import { suspendBackGuard, resumeBackGuard } from "../utils/back-guard.js";
import { MAX_BACKUP_FILE_BYTES } from "../constants.js";

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
    announce("导出失败：" + error.message, { showToast: true });
  }
}

export function openImportBackupPicker() {
  suspendBackGuard();
  importBackupInput.click();
  window.addEventListener("focus", () => resumeBackGuard(), { once: true });
}

export function importBackup(file) {
  if (file.size > MAX_BACKUP_FILE_BYTES) {
    announce("备份文件过大，请先精简作业或名单后再导入。", { showToast: true });
    importBackupInput.value = "";
    return;
  }

  const reader = new FileReader();
  reader.onload = function(event) {
    try {
      const data = JSON.parse(event.target.result);

      if (!data || !Array.isArray(data.assignments)) {
        announce("备份文件格式无效：缺少 assignments 数组", { showToast: true });
        return;
      }

      openConfirm({
        title: "导入备份",
        message: "当前所有数据将被覆盖，确定导入此备份吗？",
        okText: "导入",
        danger: true,
        onConfirm: function() {
          try {
            const result = replaceAppStateFromBackup(data);
            if (!result.ok) {
              announce(result.error, { showToast: true });
              return;
            }
            scheduleRender();
            if (settingsPanel.classList.contains("is-open")) {
              void closeSettings();
            } else {
              closeDrawer();
            }
            closeConfirm();
            announce("备份已导入");
          } catch (err) {
            announce("导入失败：" + err.message, { showToast: true });
          }
        }
      });
    } catch (error) {
      announce("无法解析备份文件：" + error.message, { showToast: true });
    }
  };
  reader.readAsText(file);
}
