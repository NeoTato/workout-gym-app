import type { SqlExecutor } from './workoutStore.ts';

// Runs inside initialize's transaction. Old numeric values are copied unchanged.
export async function migrateFlexibleLogging(tx: SqlExecutor) {
  const columns = async (table: string) => (await tx.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`)).map(row => row.name);
  if (!(await columns('sessions')).includes('record_only')) await tx.execAsync('ALTER TABLE sessions ADD COLUMN record_only INTEGER NOT NULL DEFAULT 0 CHECK(record_only IN (0,1));');
  if (!(await columns('routine_slots')).includes('tracking')) await tx.execAsync("ALTER TABLE routine_slots ADD COLUMN tracking TEXT CHECK(tracking IN ('duration','distance_duration'));");
  if (!(await columns('sets')).includes('duration_seconds')) await tx.execAsync(`
    CREATE TABLE sets_flexible (
      id TEXT PRIMARY KEY,session_exercise_id TEXT NOT NULL REFERENCES session_exercises(id) ON DELETE CASCADE,
      position INTEGER NOT NULL,load_value REAL CHECK(load_value>=0),reps INTEGER CHECK(reps IS NULL OR (typeof(reps)='integer' AND reps>0)),
      duration_seconds INTEGER CHECK(duration_seconds IS NULL OR (typeof(duration_seconds)='integer' AND duration_seconds>0)),distance_meters REAL CHECK(distance_meters>0),
      CHECK((reps IS NOT NULL AND duration_seconds IS NULL AND distance_meters IS NULL)
        OR (reps IS NULL AND load_value IS NULL AND duration_seconds IS NOT NULL)),UNIQUE(session_exercise_id,position));
    INSERT INTO sets_flexible(id,session_exercise_id,position,load_value,reps) SELECT id,session_exercise_id,position,load_value,reps FROM sets;
    DROP TABLE sets;
    ALTER TABLE sets_flexible RENAME TO sets;
  `);
  for (const event of ['INSERT', 'UPDATE', 'DELETE']) await tx.execAsync(`CREATE TRIGGER IF NOT EXISTS backup_revision_sets_${event.toLowerCase()} AFTER ${event} ON sets BEGIN UPDATE store_metadata SET revision=revision+1 WHERE singleton=1; END;`);
  await tx.execAsync('PRAGMA user_version=9;');
}
