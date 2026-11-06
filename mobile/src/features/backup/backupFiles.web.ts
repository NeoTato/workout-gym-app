import { backupFilename, checkBackupSize, readBackupBytes } from './backupBytes';
import type { BackupFiles } from './backupFiles.types';
import { saveTextFile } from '../export/saveTextFile';

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
  save: text => saveTextFile({ text, filename: backupFilename(), mimeType: 'application/json', uti: 'public.json', title: 'Save your workout backup' }),
};
