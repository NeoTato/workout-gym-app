import { getDocumentAsync } from 'expo-document-picker';
import { Directory, File, Paths } from 'expo-file-system';
import { isAvailableAsync, shareAsync } from 'expo-sharing';
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
  async save(text) {
    if (!await isAvailableAsync()) throw new Error('Sharing is not available on this device. Try again on a device with a share destination.');
    const folder = new Directory(Paths.cache, 'workout-backups'); folder.create({ idempotent: true });
    const file = new File(folder, backupFilename()); file.create(); file.write(text);
    await shareAsync(file.uri, { mimeType: 'application/json', UTI: 'public.json', dialogTitle: 'Save your workout backup' });
    return 'Share sheet closed. Make sure you saved a copy to Files or another destination.';
  },
};
