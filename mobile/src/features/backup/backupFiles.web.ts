import { backupFilename, checkBackupSize, readBackupBytes } from './backupBytes';
import type { BackupFiles } from './backupFiles.types';

export const backupFiles: BackupFiles = {
  pick: () => new Promise((resolve, reject) => {
    const input = document.createElement('input'); input.type = 'file'; input.accept = '.json,application/json';
    input.style.display = 'none'; document.body.appendChild(input);
    const cleanup = () => input.remove();
    input.addEventListener('cancel', () => { cleanup(); resolve(null); }, { once: true });
    input.addEventListener('change', () => {
      const file = input.files?.[0]; cleanup();
      if (!file) { resolve(null); return; }
      try {
        checkBackupSize(file.size);
        resolve({ name: file.name, dispose: () => undefined, read: async () => { checkBackupSize(file.size); return readBackupBytes(new Uint8Array(await file.arrayBuffer())); } });
      } catch (error) { reject(error); }
    }, { once: true });
    // Open synchronously from the button gesture; browsers block deferred dialogs.
    input.click();
  }),
  async save(text) {
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = backupFilename();
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return 'Download started. Check your Downloads folder for the JSON backup.';
  },
};
