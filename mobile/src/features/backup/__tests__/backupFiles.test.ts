import { getDocumentAsync } from 'expo-document-picker';
import { shareAsync } from 'expo-sharing';
import { backupFiles } from '../backupFiles.native';

const mockWrite = jest.fn(), mockCreate = jest.fn(), mockDelete = jest.fn();
jest.mock('expo-document-picker', () => ({ getDocumentAsync: jest.fn() }));
jest.mock('expo-sharing', () => ({ isAvailableAsync: jest.fn(async () => true), shareAsync: jest.fn(async () => undefined) }));
jest.mock('../backupBytes', () => ({ checkBackupSize: jest.fn(), readBackupBytes: jest.fn(async () => ({ text: '{}', fingerprint: 'sha' })), backupFilename: () => 'generated.json' }));
jest.mock('expo-file-system', () => ({
  Paths: { cache: { uri: 'file:///cache/' } },
  Directory: class { uri = 'file:///cache/workout-backups'; create = mockCreate; },
  File: class {
    uri: string; size = 2; exists = true; create = mockCreate; write = mockWrite; delete = mockDelete;
    constructor(source: string | { uri: string }, filename?: string) { this.uri = typeof source === 'string' ? source : `${source.uri}/${filename}`; }
    async arrayBuffer() { return new TextEncoder().encode('{}').buffer; }
  },
}));

test('native picker cancellation is benign and cached file is reread before replacement', async () => {
  jest.mocked(getDocumentAsync).mockResolvedValueOnce({ canceled: true, assets: null });
  expect(await backupFiles.pick()).toBeNull();
  jest.mocked(getDocumentAsync).mockResolvedValueOnce({ canceled: false, assets: [{ uri: 'file:///cache/picked.json', name: 'personal.json', size: 2, lastModified: 0 }] });
  const file = await backupFiles.pick(); expect(file?.name).toBe('personal.json');
  expect(getDocumentAsync).toHaveBeenLastCalledWith(expect.objectContaining({ copyToCacheDirectory: true }));
  expect(await file?.read()).toEqual({ text: '{}', fingerprint: 'sha' }); file?.dispose(); expect(mockDelete).toHaveBeenCalledTimes(1);
});

test('cleanup never deletes the provider original and sharing never claims a durable save', async () => {
  jest.mocked(getDocumentAsync).mockResolvedValueOnce({ canceled: false, assets: [{ uri: 'content://provider/original.json', name: 'original.json', size: 2, lastModified: 0 }] });
  const file = await backupFiles.pick(); file?.dispose(); expect(mockDelete).not.toHaveBeenCalled();
  expect(await backupFiles.save('{"journal":true}')).toMatch(/Make sure you saved a copy/);
  expect(mockWrite).toHaveBeenCalledWith('{"journal":true}');
  expect(shareAsync).toHaveBeenCalledWith('file:///cache/workout-backups/generated.json', expect.objectContaining({ mimeType: 'application/json', UTI: 'public.json' }));
});
