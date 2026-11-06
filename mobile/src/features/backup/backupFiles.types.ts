export type BackupFile = { name: string; read: () => Promise<{ text: string; fingerprint: string }>; dispose: () => void };
export type BackupFiles = { pick: () => Promise<BackupFile | null>; save: (text: string) => Promise<string> };
