import { digest } from 'expo-crypto';
import { readBackupBytes, checkBackupSize } from '../backupBytes';
import { MAX_BACKUP_BYTES } from '../../../domain/backup';

jest.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
  digest: jest.fn(async () => new Uint8Array([0xab, 0x00, 0xff]).buffer),
}));

test('reads strict UTF-8 and fingerprints the original bytes, including BOM', async () => {
  const bytes = new TextEncoder().encode('\uFEFF{"name":"café 🏋"}');
  const result = await readBackupBytes(bytes);
  expect(result.text).toBe('{"name":"café 🏋"}');
  expect(result.fingerprint).toBe('ab00ff');
  expect(digest).toHaveBeenCalledWith('SHA-256', bytes);
});

test('rejects malformed UTF-8 and oversized files before decoding', async () => {
  await expect(readBackupBytes(new Uint8Array([0xc3, 0x28]))).rejects.toThrow(/not valid UTF-8/);
  expect(() => checkBackupSize(MAX_BACKUP_BYTES)).not.toThrow();
  expect(() => checkBackupSize(MAX_BACKUP_BYTES + 1)).toThrow(/50 MiB/);
});
