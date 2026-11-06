import { completedExercises, localDate } from '../domain/workout.ts';
import type { CompletedExercise, Location, SavedWorkout, WorkoutDraft, WorkoutListItem } from '../domain/workout.ts';
import { activityDateValue, type LocationFilter } from '../domain/workoutCalendar.ts';
import { periodBounds, shiftSummaryPeriod, summarizePeriod, type SummaryPeriod, type WorkoutCoverage } from '../domain/workoutSummary.ts';
import { calculateConsistency, consistencyForPeriod, effectiveWeeklyTarget, type WeeklyGoal } from '../domain/weeklyGoals.ts';
import type { PreviousExercise, ReferenceContext, ReferenceExercise } from '../domain/workoutReferences.ts';
import { routineExercises, type Routine, type RoutineExercise } from '../domain/routine.ts';
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
  function routineName(name: string) {
    const clean = cleanExerciseName(name);
    if (!clean || clean.length > 80) throw new Error('Enter a routine name between 1 and 80 characters.');
    return clean;
  }
  async function readRoutine(row: Omit<Routine, 'exercises'>): Promise<Routine> {
    const rows = await db.getAllAsync<Omit<RoutineExercise, 'bodyweight'> & { bodyweight: number }>(
      'SELECT exercise_id AS catalogId,name,equipment,bodyweight,unit,convention,category,subcategory,set_count AS setCount FROM routine_slots WHERE routine_id=? ORDER BY position', row.id);
    return { ...row, exercises: rows.map(exercise => ({ ...exercise, bodyweight: Boolean(exercise.bodyweight) })) };
  }
  async function weeklyInputs(asOf: string) {
    activityDateValue(asOf);
    const goals = await db.getAllAsync<WeeklyGoal>('SELECT effective_week_start AS effectiveWeekStart,target_days AS targetDays FROM weekly_goals ORDER BY effective_week_start');
    const rows = await db.getAllAsync<{ date: string }>("SELECT DISTINCT activity_date AS date FROM sessions WHERE status='completed' AND activity_date<=? ORDER BY activity_date", asOf);
    return { goals, dates: rows.map(row => row.date) };
  }
  return {
    initialize: () => queue(async () => {
      await db.execAsync('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;');
      await db.transaction(async tx => {
        const version = (await tx.getFirstAsync<{ user_version: number }>('PRAGMA user_version'))?.user_version ?? 0;
        if (version > 6) throw new Error('This database was created by a newer app. Update the app to open it.');
        if (version === 0) await tx.execAsync(schema);
        if (version < 2) await tx.execAsync('ALTER TABLE locations ADD COLUMN archived INTEGER NOT NULL DEFAULT 0 CHECK(archived IN (0,1)); PRAGMA user_version=2;');
        if (version < 3) await tx.execAsync("ALTER TABLE exercises ADD COLUMN category TEXT NOT NULL DEFAULT '' CHECK(category IN ('','Push','Pull','Legs','Core','Cardio','Mobility','Other')); PRAGMA user_version=3;");
        if (version < 4) await tx.execAsync("ALTER TABLE exercises ADD COLUMN subcategory TEXT NOT NULL DEFAULT '' CHECK(subcategory='' OR (category='Push' AND subcategory IN ('Chest','Triceps','Shoulders')) OR (category='Pull' AND subcategory IN ('Back','Biceps'))); PRAGMA user_version=4;");
        if (version < 5) await tx.execAsync(`
          CREATE TABLE routines (id TEXT PRIMARY KEY,name TEXT NOT NULL COLLATE NOCASE UNIQUE,session_type TEXT NOT NULL,location_id TEXT NOT NULL REFERENCES locations(id),location_name_snapshot TEXT NOT NULL);
          CREATE TABLE routine_slots (routine_id TEXT NOT NULL REFERENCES routines(id) ON DELETE CASCADE,position INTEGER NOT NULL,exercise_id TEXT NOT NULL REFERENCES exercises(id),
            name TEXT NOT NULL,equipment TEXT NOT NULL,bodyweight INTEGER NOT NULL CHECK(bodyweight IN (0,1)),unit TEXT NOT NULL,convention TEXT NOT NULL,category TEXT NOT NULL,subcategory TEXT NOT NULL,set_count INTEGER NOT NULL CHECK(set_count>0),PRIMARY KEY(routine_id,position));
          PRAGMA user_version=5;`);
        if (version < 6) {
          await tx.execAsync("CREATE TABLE weekly_goals (effective_week_start TEXT NOT NULL PRIMARY KEY CHECK(COALESCE(strftime('%w',effective_week_start),'')='1'),target_days INTEGER NOT NULL CHECK(typeof(target_days)='integer' AND target_days BETWEEN 1 AND 7));");
          await tx.runAsync('INSERT INTO weekly_goals VALUES (?,?)', periodBounds('week', localDate(new Date(now()))).start, 3);
          await tx.execAsync('PRAGMA user_version=6;');
        }
      });
    }),
    listLocations: () => queue(() => db.getAllAsync<Location>('SELECT * FROM locations ORDER BY kind DESC,name')),
    getWeeklyConsistency: (asOf = localDate(new Date(now()))) => queue(async () => {
      const input = await weeklyInputs(asOf); return calculateConsistency(input.dates, input.goals, asOf);
    }),
    scheduleWeeklyGoal: (targetDays: number, today = localDate(new Date(now()))) => queue(async () => {
      if (!Number.isInteger(targetDays) || targetDays < 1 || targetDays > 7) throw new Error('Choose a weekly target from 1 to 7 active days.');
      const next = shiftSummaryPeriod('week', today, 1);
      if (!next) throw new Error('A target cannot be scheduled beyond the supported calendar.');
      const goals = await db.getAllAsync<WeeklyGoal>('SELECT effective_week_start AS effectiveWeekStart,target_days AS targetDays FROM weekly_goals ORDER BY effective_week_start');
      if (effectiveWeeklyTarget(goals, today) === targetDays) await db.runAsync('DELETE FROM weekly_goals WHERE effective_week_start=?', next);
      else await db.runAsync('INSERT INTO weekly_goals VALUES (?,?) ON CONFLICT(effective_week_start) DO UPDATE SET target_days=excluded.target_days', next, targetDays);
      return next;
    }),
    getPeriodSummary: (kind: SummaryPeriod, anchor: string, today = localDate(new Date(now()))) => queue(async () => {
      activityDateValue(today);
      const bounds = periodBounds(kind, anchor), end = bounds.end < today ? bounds.end : today;
      const input = await weeklyInputs(today), consistency = consistencyForPeriod(kind, anchor, input.dates, input.goals, today);
      if (bounds.start > today) return { ...summarizePeriod(kind, anchor, today, [], []), consistency };
      const items = await db.getAllAsync<WorkoutListItem>(`SELECT id,timezone,activity_date AS activityDate,session_type_name_snapshot AS sessionType,location_id AS locationId,location_kind_snapshot AS locationKind,location_name_snapshot AS locationName,started_at AS startedAt,ended_at AS endedAt FROM sessions WHERE status='completed' AND activity_date>=? AND activity_date<=?`, bounds.start, end);
      const coverage = await db.getAllAsync<WorkoutCoverage>(`SELECT DISTINCT s.id AS sessionId,CASE WHEN e.subcategory<>'' THEN e.subcategory WHEN e.category<>'' THEN e.category ELSE 'Uncategorized' END AS "group"
        FROM sessions s JOIN session_exercises se ON se.session_id=s.id JOIN exercises e ON e.id=se.exercise_id WHERE s.status='completed' AND s.activity_date>=? AND s.activity_date<=?`, bounds.start, end);
      return { ...summarizePeriod(kind, anchor, today, items, coverage), consistency };
    }),
    listRoutines: () => queue(async () => {
      const rows = await db.getAllAsync<Omit<Routine, 'exercises'>>('SELECT id,name,session_type AS sessionType,location_id AS locationId,location_name_snapshot AS locationName FROM routines ORDER BY name COLLATE NOCASE,id');
      const result: Routine[] = [];
      for (const row of rows) result.push(await readRoutine(row));
      return result;
    }),
    saveWorkoutAsRoutine: (workoutId: string, name: string, replaceId?: string) => queue(async (): Promise<Routine> => {
      const clean = routineName(name), routineId = replaceId ?? id();
      const saved = await readWorkout(workoutId);
      const metadata = await db.getFirstAsync<{ locationId: string }>('SELECT location_id AS locationId FROM sessions WHERE id=?', workoutId);
      if (!metadata) throw new Error('This workout could not be found.');
      const routine: Routine = { id: routineId, name: clean, sessionType: saved.sessionType, locationId: metadata.locationId, locationName: saved.locationName, exercises: routineExercises(saved) };
      await db.transaction(async tx => {
        if (replaceId && !await tx.getFirstAsync('SELECT id FROM routines WHERE id=?', replaceId)) throw new Error('This routine could not be found.');
        if (await tx.getFirstAsync('SELECT id FROM routines WHERE name=? COLLATE NOCASE AND id<>?', clean, routineId)) throw new Error('A routine with this name already exists. Choose another name.');
        if (replaceId) {
          await tx.runAsync('UPDATE routines SET name=?,session_type=?,location_id=?,location_name_snapshot=? WHERE id=?', clean, routine.sessionType, routine.locationId, routine.locationName, routineId);
          await tx.runAsync('DELETE FROM routine_slots WHERE routine_id=?', routineId);
        } else await tx.runAsync('INSERT INTO routines VALUES (?,?,?,?,?)', routineId, clean, routine.sessionType, routine.locationId, routine.locationName);
        for (const [position, exercise] of routine.exercises.entries()) await tx.runAsync('INSERT INTO routine_slots VALUES (?,?,?,?,?,?,?,?,?,?,?)',
          routineId, position, exercise.catalogId, exercise.name, exercise.equipment, exercise.bodyweight ? 1 : 0, exercise.unit, exercise.convention,
          exercise.category ?? '', exercise.subcategory ?? '', exercise.setCount);
      });
      return routine;
    }),
    renameRoutine: (routineId: string, name: string) => queue(async () => {
      const clean = routineName(name);
      if (!await db.getFirstAsync('SELECT id FROM routines WHERE id=?', routineId)) throw new Error('This routine could not be found.');
      if (await db.getFirstAsync('SELECT id FROM routines WHERE name=? COLLATE NOCASE AND id<>?', clean, routineId)) throw new Error('A routine with this name already exists. Choose another name.');
      await db.runAsync('UPDATE routines SET name=? WHERE id=?', clean, routineId);
    }),
    removeRoutine: (routineId: string) => queue(async () => { await db.runAsync('DELETE FROM routines WHERE id=?', routineId); }),
    getRecentSessions: (context: ReferenceContext, sessionType: string) => queue(() => db.getAllAsync<Omit<SavedWorkout, 'exercises'>>(
      `SELECT id,timezone,activity_date AS activityDate,session_type_name_snapshot AS sessionType,location_name_snapshot AS locationName,started_at AS startedAt,ended_at AS endedAt FROM sessions
       WHERE status='completed' AND location_id=? AND session_type_name_snapshot=? AND id<>?
       AND (activity_date<? OR (activity_date=? AND started_at<?)) ORDER BY activity_date DESC,started_at DESC,id DESC LIMIT 3`,
      context.locationId, sessionType, context.excludeSessionId, context.activityDate, context.activityDate, context.startedAt)),
    getPreviousExercise: (context: ReferenceContext, exercise: ReferenceExercise) => queue(async (): Promise<PreviousExercise | null> => {
      if (!context.locationId || !exercise.name.trim()) return null;
      const mode = exercise.bodyweight ? 'reps' : 'load_reps';
      const choices = await db.getAllAsync<{ id: string; name: string; category: ExerciseCategory; subcategory: ExerciseSubcategory }>('SELECT id,name,category,subcategory FROM exercises WHERE measurement_mode=? ORDER BY id', mode);
      const sameName = (item: { name: string }) => exerciseNameKey(item.name) === exerciseNameKey(exercise.name);
      const catalog = choices.find(item => item.id === exercise.catalogId && sameName(item)) ?? choices.find(sameName);
      if (!catalog) return null;
      const row = await db.getFirstAsync<{ id: string; workoutId: string; activityDate: string; sessionType: string; locationName: string; name: string; equipment: string; unit: CompletedExercise['unit']; convention: CompletedExercise['convention'] }>(
        `SELECT se.id,s.id AS workoutId,s.activity_date AS activityDate,s.session_type_name_snapshot AS sessionType,s.location_name_snapshot AS locationName,
         se.exercise_name_snapshot AS name,se.equipment_name_snapshot AS equipment,se.load_unit AS unit,se.load_convention AS convention
         FROM sessions s JOIN session_exercises se ON se.session_id=s.id JOIN equipment_variations ev ON ev.id=se.equipment_variation_id
         WHERE s.status='completed' AND s.location_id=? AND ev.location_id=? AND ev.exercise_id=? AND ev.name=? AND ev.measurement_mode=? AND ev.load_convention=? AND ev.load_dimension=?
         AND s.id<>? AND (s.activity_date<? OR (s.activity_date=? AND s.started_at<?))
         ORDER BY s.activity_date DESC,s.started_at DESC,s.id DESC,se.position DESC LIMIT 1`,
        context.locationId, context.locationId, catalog.id, exercise.equipment.trim() || cleanExerciseName(catalog.name), mode,
        exercise.bodyweight ? 'total' : exercise.convention, exercise.bodyweight ? 'bodyweight' : exercise.unit === 'plates' ? 'plates' : 'mass',
        context.excludeSessionId, context.activityDate, context.activityDate, context.startedAt);
      if (!row) return null;
      const sets = await db.getAllAsync<CompletedExercise['sets'][number]>('SELECT id,load_value AS weight,reps FROM sets WHERE session_exercise_id=? ORDER BY position', row.id);
      return { workoutId: row.workoutId, activityDate: row.activityDate, sessionType: row.sessionType, locationName: row.locationName,
        exercise: { id: row.id, catalogId: catalog.id, category: catalog.category, subcategory: catalog.subcategory, name: row.name, equipment: row.equipment,
          unit: row.unit, convention: row.convention, bodyweight: exercise.bodyweight, sets } };
    }),
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
    listWorkouts: () => queue(() => db.getAllAsync<WorkoutListItem>(`SELECT id,timezone,activity_date AS activityDate,session_type_name_snapshot AS sessionType,location_id AS locationId,location_kind_snapshot AS locationKind,location_name_snapshot AS locationName,started_at AS startedAt,ended_at AS endedAt FROM sessions WHERE status='completed' ORDER BY activity_date DESC,started_at DESC,id DESC`)),
    getDayWorkouts: (date: string, filter: LocationFilter) => queue(async (): Promise<SavedWorkout[]> => {
      activityDateValue(date);
      if (!['all', 'gym', 'home'].includes(filter)) throw new Error('Choose a valid location filter.');
      const rows = await db.getAllAsync<{ id: string }>(`SELECT id FROM sessions WHERE status='completed' AND activity_date=? AND (?='all' OR location_kind_snapshot=?) ORDER BY started_at,id`, date, filter, filter);
      const result: SavedWorkout[] = [];
      for (const row of rows) result.push(await readWorkout(row.id));
      return result;
    }),
    getWorkout: (sessionId: string) => queue(async (): Promise<SavedWorkout> => {
      return readWorkout(sessionId);
    }),
  };
}
export type WorkoutStore = ReturnType<typeof createWorkoutStore>;
