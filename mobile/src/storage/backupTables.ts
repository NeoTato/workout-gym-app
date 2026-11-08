// App-owned identifiers only. Backup files never supply SQL table or column names.
export const backupTables = [
  { key: 'locations', table: 'locations', fields: 'id,name,kind,archived', booleans: ['archived'] },
  { key: 'exercises', table: 'exercises', fields: 'id,name,measurement_mode,category,subcategory' },
  { key: 'equipmentVariations', table: 'equipment_variations', fields: 'id,exercise_id,location_id,name,measurement_mode,load_convention,load_dimension' },
  { key: 'routines', table: 'routines', fields: 'id,name,session_type,location_id,location_name_snapshot' },
  { key: 'routineSlots', table: 'routine_slots', fields: 'routine_id,position,exercise_id,name,equipment,bodyweight,unit,convention,category,subcategory,set_count,tracking', booleans: ['bodyweight'] },
  { key: 'sessions', table: 'sessions', fields: 'id,activity_date,timezone,started_at,ended_at,location_id,location_name_snapshot,location_kind_snapshot,session_type_name_snapshot,status,record_only', booleans: ['recordOnly'] },
  { key: 'sessionExercises', table: 'session_exercises', fields: 'id,session_id,exercise_id,equipment_variation_id,position,exercise_name_snapshot,equipment_name_snapshot,bodyweight,load_unit,load_convention', booleans: ['bodyweight'] },
  { key: 'sets', table: 'sets', fields: 'id,session_exercise_id,position,load_value,reps,duration_seconds,distance_meters' },
  { key: 'weeklyGoals', table: 'weekly_goals', fields: 'effective_week_start,target_days' },
] as const;

export const camelCase = (column: string) => column.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());

export const revisionSchema = `
  CREATE TABLE IF NOT EXISTS store_metadata (singleton INTEGER PRIMARY KEY CHECK(singleton=1),revision INTEGER NOT NULL);
  INSERT OR IGNORE INTO store_metadata VALUES (1,0);
  ${[...backupTables.map(item => item.table), 'draft_checkpoint'].flatMap(table => ['INSERT', 'UPDATE', 'DELETE'].map(event => `
    CREATE TRIGGER IF NOT EXISTS backup_revision_${table}_${event.toLowerCase()} AFTER ${event} ON ${table}
    BEGIN UPDATE store_metadata SET revision=revision+1 WHERE singleton=1; END;`)).join('\n')}
  PRAGMA user_version=7;
`;
