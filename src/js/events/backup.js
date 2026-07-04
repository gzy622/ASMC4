import {
  exportBackupBtn,
  importBackupInput
} from "../dom-refs.js";
import { resumeBackGuard } from "../utils/back-guard.js";
import { traceEvent } from "../utils/trace.js";

export function bindBackupEvents() {
  exportBackupBtn.addEventListener("click", async () => {
    traceEvent("backup.export");
    const { exportBackup } = await import("../ui/backup.js");
    exportBackup();
  });

  importBackupInput.addEventListener("change", async event => {
    resumeBackGuard();
    const file = event.target.files[0];
    if (!file) return;
    traceEvent("backup.import", { size: file.size });
    const { importBackup } = await import("../ui/backup.js");
    importBackup(file);
    importBackupInput.value = "";
  });
}
