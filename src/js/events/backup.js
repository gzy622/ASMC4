import {
  exportBackupBtn,
  importBackupBtn,
  importBackupInput
} from "../dom-refs.js";
import { exportBackup, importBackup } from "../ui/backup.js";

export function bindBackupEvents() {
  exportBackupBtn.addEventListener("click", exportBackup);
  importBackupBtn.addEventListener("click", () => importBackupInput.click());

  importBackupInput.addEventListener("change", event => {
    const file = event.target.files[0];
    if (!file) return;
    importBackup(file);
    importBackupInput.value = "";
  });
}
