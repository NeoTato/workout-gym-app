import { completedExercises } from '../domain/workout.ts';
import type { CompletedExercise, Location, SavedWorkout, WorkoutDraft } from '../domain/workout.ts';
import { schema } from './schema.ts';
import { workoutTimes } from '../domain/workoutTime.ts';
import { cleanExerciseName, exerciseNameKey, type ExerciseCategory, type ExerciseSubcategory, type LoggedExercise } from '../domain/exerciseLibrary.ts';

type Param = string | number | null;
export interface SqlExecutor {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, ...params: Param[]): Promise<unknown>;
  getFirstAsync<T>(sql: string, ...params: Param[]): Promise<T | null>;
  getAllAsync<T>(sql: string, ...params: Param[]): Promise<T[]>;
}
export interface SqlDatabase extends SqlExecutor {
  transaction(work: (tx: SqlExecutor) => Promise<void>): Promise<void>;
}

export function createWorkoutStore(db: SqlDatabase, id: () => string, now: () => string) {
  // This queue owns ALL access to this connection, including reads. No unrelated
  // queries can accidentally join a withTransactionAsync transaction.
  let tail: Promise<unknown> = Promise.resolve();
  function queue<T>(work: () => Promise<T>): Promise<T> {
    const next = tail.catch(() => undefined).then(work);
    tail = next;
    return next;
  }
  async function writeExercises(tx: SqlExecutor, sessionId: string, locationId: string, exercises: CompletedExercise[]) {
    for (const [position, exercise] of exercises.entries()) {
      const mode = exercise.bodyweight ? 'reps' : 'load_reps';
      const choices = await tx.getAllAsync<{ id: string; name: string; category: ExerciseCategory; subcategory: ExerciseSubcategory }>('SELECT id,name,category,subcategory FROM exercises WHERE measurement_mode=? ORDER BY id', mode);
      const sameName = (item: { name: string }) => exerciseNameKey(item.name) === exerciseNameKey(exercise.name);
      let catalog = choices.find(item => item.id === exercise.catalogId && sameName(item)) ?? choices.find(sameName);
      if (!catalog) {
        catalog = { id: id(), name: exercise.name, category: exercise.category ?? '', subcategory: exercise.subcategory ?? '' };
        await tx.runAsync('INSERT INTO exercises(id,name,measurement_mode,category,subcategory) VALUES (?,?,?,?,?)', catalog.id, exercise.name, mode, catalog.category, catalog.subcategory);
      }
      if (exercise.category !== undefined) {
        const subcategory = exercise.subcategory ?? (exercise.category === catalog.category ? catalog.subcategory : '');
        await tx.runAsync('UPDATE exercises SET category=?,subcategory=? WHERE id=?', exercise.category, subcategory, catalog.id);
      }
      const equipmentName = exercise.equipment || cleanExerciseName(catalog.name);
      const convention = exercise.bodyweight ? 'total' : exercise.convention;
      const dimension = exercise.bodyweight ? 'bodyweight' : exercise.unit === 'plates' ? 'plates' : 'mass';
      let equipment = await tx.getFirstAsync<{ id: string }>('SELECT id FROM equipment_variations WHERE exercise_id=? AND location_id=? AND name=? AND measurement_mode=? AND load_convention=? AND load_dimension=?', catalog.id, locationId, equipmentName, mode, convention, dimension);
      if (!equipment) {
        equipment = { id: id() };
        await tx.runAsync('INSERT INTO equipment_variations VALUES (?,?,?,?,?,?,?)', equipment.id, catalog.id, locationId, equipmentName, mode, convention, dimension);
      }
      await tx.runAsync('INSERT INTO session_exercises VALUES (?,?,?,?,?,?,?,?,?,?)', exercise.id, sessionId, catalog.id, equipment.id, position, cleanExerciseName(catalog.name), equipmentName, exercise.bodyweight ? 1 : 0, exercise.unit, convention);
      for (const [setPosition, set] of exercise.sets.entries()) {
        await tx.runAsync('INSERT INTO sets VALUES (?,?,?,?,?)', set.id, exercise.id, setPosition, set.weight, set.reps);
      }
    }
  }
  async function readWorkout(sessionId: string): Promise<SavedWorkout> {
    const session = await db.getFirstAsync<Omit<SavedWorkout, 'exercises'>>('SELECT id,timezone,activity_date AS activityDate,session_type_name_snapshot AS sessionType,location_name_snapshot AS locationName,started_at AS startedAt,ended_at AS endedAt FROM sessions WHERE id=?', sessionId);
    if (!session) throw new Error('This workout could not be found.');
    const rows = await db.getAllAsync<{ id: string; catalogId: string; category: ExerciseCategory; subcategory: ExerciseSubcategory; name: string; equipment: string; bodyweight: number; unit: CompletedExercise['unit']; convention: CompletedExercise['convention'] }>('SELECT se.id,se.exercise_id AS catalogId,e.category,e.subcategory,se.exercise_name_snapshot AS name,se.equipment_name_snapshot AS equipment,se.bodyweight,se.load_unit AS unit,se.load_convention AS convention FROM session_exercises se JOIN exercises e ON e.id=se.exercise_id WHERE se.session_id=? ORDER BY se.position', sessionId);
    const exercises: CompletedExercise[] = [];
    for (const exercise of rows) {
      const sets = await db.getAllAsync<CompletedExercise['sets'][number]>('SELECT id,load_value AS weight,reps FROM sets WHERE session_exercise_id=? ORDER BY position', exercise.id);
      exercises.push({ ...exercise, bodyweight: Boolean(exercise.bodyweight), sets });
    }
    return { ...session, exercises };
  }
  return {
    initialize: () => queue(async () => {
      await db.execAsync('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;');
      await db.transaction(async tx => {
        const version = (await tx.getFirstAsync<{ user_version: number }>('PRAGMA user_version'))?.user_version ?? 0;
        if (version > 4) throw new Error('This database was created by a newer app. Update the app to open it.');
        if (version === 0) await tx.execAsync(schema);
        if (version < 2) await tx.execAsync('ALTER TABLE locations ADD COLUMN archived INTEGER NOT NULL DEFAULT 0 CHECK(archived IN (0,1)); PRAGMA user_version=2;');
        if (version < 3) await tx.execAsync("ALTER TABLE exercises ADD COLUMN category TEXT NOT NULL DEFAULT '' CHECK(category IN ('','Push','Pull','Legs','Core','Cardio','Mobility','Other')); PRAGMA user_version=3;");
        if (version < 4) await tx.execAsync("ALTER TABLE exercises ADD COLUMN subcategory TEXT NOT NULL DEFAULT '' CHECK(subcategory='' OR (category='Push' AND subcategory IN ('Chest','Triceps','Shoulders')) OR (category='Pull' AND subcategory IN ('Back','Biceps'))); PRAGMA user_version=4;");
      });
    }),
    listLocations: () => queue(() => db.getAllAsync<Location>('SELECT * FROM locations ORDER BY kind DESC,name')),
    removeLocation: (locationId: string) => queue(async () => {
      const location = await db.getFirstAsync<Location>('SELECT * FROM locations WHERE id=?', locationId);
      if (!location) throw new Error('This location could not be found.');
      if (location.kind === 'home') throw new Error('Home is a built-in location and cannot be removed.');
      await db.runAsync('UPDATE locations SET archived=1 WHERE id=?', locationId);
    }),
    listLoggedExercises: () => queue(async (): Promise<LoggedExercise[]> => {
      const rows = await db.getAllAsync<{ id: string; name: string; category: ExerciseCategory; subcategory: ExerciseSubcategory; measurement_mode: string }>(
        'SELECT DISTINCT e.id,e.name,e.category,e.subcategory,e.measurement_mode FROM exercises e JOIN session_exercises se ON se.exercise_id=e.id JOIN sessions s ON s.id=se.session_id WHERE s.status=? ORDER BY e.name COLLATE NOCASE,e.id', 'completed');
      const seen = new Set<string>();
      return rows.flatMap(row => {
        const key = `${row.measurement_mode}:${exerciseNameKey(row.name)}`;
        if (seen.has(key)) return [];
        seen.add(key);
        return [{ id: row.id, name: cleanExerciseName(row.name), bodyweight: row.measurement_mode === 'reps', category: row.category, subcategory: row.subcategory }];
      });
    }),
    addGym: (name: string) => queue(async () => {
      const clean = name.trim();
      if (!clean || clean.toLowerCase() === 'home') throw new Error('Enter a gym name other than Home.');
      const existing = await db.getFirstAsync<Location>('SELECT * FROM locations WHERE name=? COLLATE NOCASE AND kind=?', clean, 'gym');
      if (existing) {
        await db.runAsync('UPDATE locations SET archived=0 WHERE id=?', existing.id);
        return { ...existing, archived: 0 };
      }
      const gym: Location = { id: id(), name: clean, kind: 'gym' };
      await db.runAsync('INSERT INTO locations(id,name,kind) VALUES (?,?,?)', gym.id, gym.name, gym.kind);
      return gym;
    }),
    getDraft: () => queue(async () => {
      const row = await db.getFirstAsync<{ payload: string }>('SELECT payload FROM draft_checkpoint WHERE singleton=1');
      return row ? JSON.parse(row.payload) as WorkoutDraft : null;
    }),
    beginDraft: (draft: WorkoutDraft) => queue(async () => {
      const row = await db.getFirstAsync<{ payload: string }>('SELECT payload FROM draft_checkpoint WHERE singleton=1');
      if (row) return JSON.parse(row.payload) as WorkoutDraft;
      await db.runAsync('INSERT INTO draft_checkpoint(singleton,session_id,payload) VALUES (1,?,?)', draft.id, JSON.stringify(draft));
      return draft;
    }),
    saveDraft: (draft: WorkoutDraft) => {
      const snapshot = JSON.stringify(draft);
      return queue(async () => {
        if (await db.getFirstAsync('SELECT id FROM sessions WHERE id=?', draft.id)) return;
        await db.runAsync('INSERT INTO draft_checkpoint(singleton,session_id,payload) VALUES (1,?,?) ON CONFLICT(singleton) DO UPDATE SET session_id=excluded.session_id,payload=excluded.payload', draft.id, snapshot);
      });
    },
    discardDraft: (sessionId: string) => queue(async () => {
      await db.runAsync('DELETE FROM draft_checkpoint WHERE session_id=?', sessionId);
    }),
    finish: (draft: WorkoutDraft) => {
      let exercises: CompletedExercise[];
      try { exercises = completedExercises(draft); } catch (error) { return Promise.reject(error); }
      return queue(async () => {
        await db.transaction(async tx => {
          if (await tx.getFirstAsync('SELECT id FROM sessions WHERE id=?', draft.id)) return;
          const location = await tx.getFirstAsync<Location>('SELECT * FROM locations WHERE id=?', draft.locationId);
          if (!location) throw new Error('Choose an existing gym or Home.');
          const times = workoutTimes(draft, now());
          await tx.runAsync('INSERT INTO sessions VALUES (?,?,?,?,?,?,?,?,?,?)', draft.id, times.activityDate, draft.timezone, times.startedAt, times.endedAt, location.id, location.name, location.kind, draft.sessionType, 'completed');
          await writeExercises(tx, draft.id, location.id, exercises);
          await tx.runAsync('DELETE FROM draft_checkpoint WHERE session_id=?', draft.id);
        });
        return draft.id;
      });
    },
    getWorkoutEdit: (sessionId: string) => queue(async (): Promise<WorkoutDraft> => {
      const saved = await readWorkout(sessionId);
      const metadata = await db.getFirstAsync<{ locationId: string; timezone: string }>('SELECT location_id AS locationId,timezone FROM sessions WHERE id=?', sessionId);
      if (!metadata) throw new Error('This workout could not be found.');
      return { id: saved.id, startedAt: saved.startedAt, endedAt: saved.endedAt, activityDate: saved.activityDate, ...metadata, sessionType: saved.sessionType,
        exercises: saved.exercises.map(exercise => ({ ...exercise, sets: exercise.sets.map(set => ({ id: set.id, weight: set.weight === null ? '' : String(set.weight), reps: String(set.reps), completed: true })) })) };
    }),
    updateWorkout: (draft: WorkoutDraft) => {
      let exercises: CompletedExercise[];
      try {
        if (draft.exercises.some(exercise => !exercise.sets.length || exercise.sets.some(set => !set.completed))) {
          throw new Error('Mark each set done, or remove the unfinished set or empty exercise, before saving.');
        }
        exercises = completedExercises(draft);
      } catch (error) { return Promise.reject(error); }
      return queue(() => db.transaction(async tx => {
        if (!await tx.getFirstAsync('SELECT id FROM sessions WHERE id=?', draft.id)) throw new Error('This workout could not be found.');
        const location = await tx.getFirstAsync<Location>('SELECT * FROM locations WHERE id=?', draft.locationId);
        if (!location) throw new Error('Choose an existing gym or Home.');
        const times = workoutTimes(draft, now());
        await tx.runAsync('UPDATE sessions SET activity_date=?,started_at=?,ended_at=?,location_id=?,location_name_snapshot=?,location_kind_snapshot=?,session_type_name_snapshot=? WHERE id=?', times.activityDate, times.startedAt, times.endedAt, location.id, location.name, location.kind, draft.sessionType, draft.id);
        await tx.runAsync('DELETE FROM session_exercises WHERE session_id=?', draft.id);
        await writeExercises(tx, draft.id, location.id, exercises);
      }));
    },
    deleteWorkout: (sessionId: string) => queue(() => db.transaction(async tx => {
      await tx.runAsync('DELETE FROM sessions WHERE id=?', sessionId);
    })),
    listWorkouts: () => queue(() => db.getAllAsync<Omit<SavedWorkout, 'exercises'>>(`SELECT id,timezone,activity_date AS activityDate,session_type_name_snapshot AS sessionType,location_name_snapshot AS locationName,started_at AS startedAt,ended_at AS endedAt FROM sessions ORDER BY activity_date DESC,started_at DESC`)),
    getWorkout: (sessionId: string) => queue(async (): Promise<SavedWorkout> => {
      return readWorkout(sessionId);
    }),
  };
}
export type WorkoutStore = ReturnType<typeof createWorkoutStore>;
