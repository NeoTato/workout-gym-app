import { CryptoDigestAlgorithm, digest } from 'expo-crypto';
import { MAX_BACKUP_BYTES } from '../../domain/backup';

export function checkBackupSize(size: number) {
  if (size > MAX_BACKUP_BYTES) throw new Error('Backup files must be 50 MiB or smaller. No data has been changed.');
}
export async function readBackupBytes(bytes: Uint8Array<ArrayBuffer>) {
  checkBackupSize(bytes.byteLength);
  let text: string;
  try { text = new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
  catch { throw new Error('This file is not valid UTF-8 text. No data has been changed.'); }
  const hash = new Uint8Array(await digest(CryptoDigestAlgorithm.SHA256, bytes));
  return { text, fingerprint: Array.from(hash, byte => byte.toString(16).padStart(2, '0')).join('') };
}
export const backupFilename = () => `workout-journal-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
