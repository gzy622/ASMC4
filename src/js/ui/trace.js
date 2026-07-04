import { isNativePlatform } from "../utils/native.js";
import { exportTraceJson, clearTrace } from "../utils/trace.js";
import { openConfirm, closeConfirm } from "./confirm.js";
import { scheduleRender } from "../render/index.js";

function timestampName() {
  const now = new Date();
  const ts = now.getFullYear()
    + String(now.getMonth() + 1).padStart(2, "0")
    + String(now.getDate()).padStart(2, "0") + "_"
    + String(now.getHours()).padStart(2, "0")
    + String(now.getMinutes()).padStart(2, "0")
    + String(now.getSeconds()).padStart(2, "0");
  return `asmc4_trace_${ts}.json`;
}

export async function exportTrace() {
  try {
    const json = exportTraceJson();
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
        title: "导出操作日志",
        files: [result.uri],
        dialogTitle: "分享日志文件"
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

export function clearTraceWithConfirm() {
  openConfirm({
    title: "清空操作日志",
    message: "确定清空内存中的操作日志记录吗？",
    okText: "清空",
    danger: true,
    onConfirm: () => {
      clearTrace();
      closeConfirm();
      scheduleRender();
    }
  });
}
