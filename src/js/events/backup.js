import {
  exportBackupBtn,
  importBackupInput
} from "../dom-refs.js";

export function bindBackupEvents() {
  exportBackupBtn.addEventListener("click", async () => {
    const { exportBackup } = await import("../ui/backup.js");
    exportBackup();
  });

  importBackupInput.addEventListener("change", async event => {
    const file = event.target.files[0];
    if (!file) return;
    const { importBackup } = await import("../ui/backup.js");
    importBackup(file);
    importBackupInput.value = "";
  });
}
