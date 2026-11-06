import { backupSummary, MAX_BACKUP_BYTES, parseBackup, utf8Size, validateBackup, type Backup } from '../domain/backup.ts';
import { backupTables, camelCase } from './backupTables.ts';
import type { SqlDatabase, SqlExecutor } from './workoutStore.ts';
import type { AppearancePreference } from '../domain/appearance.ts';

type Digest = (text: string) => Promise<string>;
type Queue = <T>(work: () => Promise<T>) => Promise<T>;
export type BackupInspection = {
  token: string; exportedAt: string; appVersion: string; appearance: AppearancePreference;
  incoming: ReturnType<typeof backupSummary>; current: ReturnType<typeof backupSummary>;
};

export function createBackupOperations(db: SqlDatabase, queue: Queue, id: () => string, now: () => string, digest: Digest) {
  let pending: { token: string; revision: number; digest: string; fingerprint: string } | null = null;
  async function revision(tx: SqlExecutor) {
    const row = await tx.getFirstAsync<{ revision: number }>('SELECT revision FROM store_metadata WHERE singleton=1');
    if (!row) throw new Error('Unable to inspect workout storage. Try again.');
    return row.revision;
  }
  async function snapshot(tx: SqlExecutor, appVersion: string): Promise<Backup> {
    const data: Record<string, unknown> = {};
    for (const item of backupTables) {
      const columns = item.fields.split(',');
      const rows = await tx.getAllAsync<Record<string, unknown>>(`SELECT ${columns.map(column => `${column} AS ${camelCase(column)}`).join(',')} FROM ${item.table} ORDER BY ${columns.slice(0, item.key === 'routineSlots' ? 2 : 1).join(',')}`);
      data[item.key] = rows.map(row => {
        const result = { ...row };
        if ('booleans' in item) for (const field of item.booleans) {
          if (result[field] === 0 || result[field] === 1) result[field] = result[field] === 1;
        }
        return result;
      });
    }
    const draft = await tx.getFirstAsync<{ payload: string }>('SELECT payload FROM draft_checkpoint WHERE singleton=1');
    data.draft = draft ? JSON.parse(draft.payload) as unknown : null;
    data.settings = await tx.getFirstAsync('SELECT appearance FROM settings WHERE singleton=1');
    return validateBackup({ format: 'workout-journal-backup', formatVersion: 1, exportedAt: now(), appVersion, data });
  }
  return {
    exportBackup: (appVersion: string) => queue(async () => {
      let text = '';
      await db.transaction(async tx => { text = JSON.stringify(await snapshot(tx, appVersion)); });
      if (utf8Size(text) > MAX_BACKUP_BYTES) throw new Error('This journal exceeds the 50 MiB backup limit. No file was created.');
      return text;
    }),
    inspectBackup: (text: string, fingerprint?: string) => queue(async (): Promise<BackupInspection> => {
      pending = null;
      const backup = parseBackup(text), hash = await digest(text);
      let current!: ReturnType<typeof backupSummary>, version = 0;
      await db.transaction(async tx => {
        version = await revision(tx);
        // Count current records without loading or validating them: a valid backup
        // must still be usable when an existing checkpoint is damaged.
        const counts = await tx.getFirstAsync<Omit<typeof current, 'hasDraft'> & { hasDraft: number }>(`SELECT
          (SELECT count(*) FROM sessions) AS workouts,(SELECT count(*) FROM exercises) AS exercises,
          (SELECT count(*) FROM sets) AS sets,(SELECT count(*) FROM routines) AS routines,
          (SELECT count(*) FROM locations) AS locations,(SELECT count(*) FROM weekly_goals) AS goals,
          (SELECT count(*) FROM draft_checkpoint) AS hasDraft,
          (SELECT min(activity_date) FROM sessions) AS firstDate,(SELECT max(activity_date) FROM sessions) AS lastDate`);
        if (!counts) throw new Error('Unable to inspect workout storage. Try again.');
        current = { ...counts, hasDraft: counts.hasDraft > 0 };
      });
      const token = id(); pending = { token, revision: version, digest: hash, fingerprint: fingerprint ?? hash };
      return { token, exportedAt: backup.exportedAt, appVersion: backup.appVersion, appearance: backup.data.settings.appearance, incoming: backupSummary(backup.data), current };
    }),
    restoreBackup: (token: string, text: string, fingerprint?: string) => queue(async () => {
      const inspection = pending; pending = null;
      const hash = await digest(text);
      const stale = () => new Error('The file or your local data changed after inspection. Inspect the file again before replacing data.');
      if (!inspection || inspection.token !== token || inspection.digest !== hash || inspection.fingerprint !== (fingerprint ?? hash)) throw stale();
      const backup = parseBackup(text);
      await db.transaction(async tx => {
        if (await revision(tx) !== inspection.revision) throw stale();
        await tx.runAsync('DELETE FROM draft_checkpoint');
        await tx.runAsync('DELETE FROM settings');
        for (const item of [...backupTables].reverse()) await tx.runAsync(`DELETE FROM ${item.table}`);
        for (const item of backupTables) {
          const columns = item.fields.split(','), rows = backup.data[item.key];
          for (let offset = 0; offset < rows.length; offset += 50) {
            const batch = rows.slice(offset, offset + 50);
            const params = batch.flatMap(row => columns.map(column => {
              const value = (row as Record<string, unknown>)[camelCase(column)];
              if (typeof value === 'boolean') return value ? 1 : 0;
              if (value === null || typeof value === 'string' || typeof value === 'number') return value;
              throw new Error('Invalid backup row. No data has been changed.');
            }));
            await tx.runAsync(`INSERT INTO ${item.table} (${item.fields}) VALUES ${batch.map(() => `(${columns.map(() => '?').join(',')})`).join(',')}`, ...params);
          }
        }
        if (backup.data.draft) await tx.runAsync('INSERT INTO draft_checkpoint VALUES (1,?,?)', backup.data.draft.id, JSON.stringify(backup.data.draft));
        await tx.runAsync('INSERT INTO settings VALUES (1,?)', backup.data.settings.appearance);
        if ((await tx.getAllAsync('PRAGMA foreign_key_check')).length) throw new Error('Backup relationships could not be restored. No data has been changed.');
      });
      return backupSummary(backup.data);
    }),
  };
}
