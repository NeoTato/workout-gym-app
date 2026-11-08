import { getDocumentAsync } from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import { saveTextFile } from '../export/saveTextFile';
import { backupFilename, checkBackupSize, readBackupBytes } from './backupBytes';
import type { BackupFiles } from './backupFiles.types';

export const backupFiles: BackupFiles = {
  async pick() {
    const result = await getDocumentAsync({ type: ['application/json', 'text/plain', 'application/octet-stream'], copyToCacheDirectory: true, multiple: false });
    if (result.canceled) return null;
    const asset = result.assets[0], file = new File(asset.uri);
    const dispose = () => { try { if (file.uri.startsWith(Paths.cache.uri.replace(/\/$/, '') + '/') && file.exists) file.delete(); } catch { /* OS cache cleanup will reclaim this copy. */ } };
    try { checkBackupSize(asset.size ?? file.size); } catch (error) { dispose(); throw error; }
    return { name: asset.name, dispose, read: async () => { checkBackupSize(file.size); return readBackupBytes(new Uint8Array(await file.arrayBuffer())); } };
  },
  save: text => saveTextFile({ text, filename: backupFilename(), mimeType: 'application/json', uti: 'public.json', title: 'Save your workout backup' }),
};
