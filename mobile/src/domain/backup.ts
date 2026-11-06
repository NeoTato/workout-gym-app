import { exerciseCategories, subcategoriesFor, type ExerciseCategory } from './exerciseLibrary.ts';
import { activityDateValue } from './workoutCalendar.ts';
import { periodBounds } from './workoutSummary.ts';
import { timeFields } from './workoutTime.ts';
import { canCompleteSet, sessionTypes, type WorkoutDraft } from './workout.ts';

export const MAX_BACKUP_BYTES = 50 * 1024 * 1024;
type Parser<T> = (value: unknown, path: string) => T;
function fail(path: string): never { throw new Error(`Invalid backup: ${path}. No data has been changed.`); }
const text: Parser<string> = (value, path) => typeof value === 'string' ? value : fail(path);
const name: Parser<string> = (value, path) => { const result = text(value, path); return result.trim() ? result : fail(path); };
const id: Parser<string> = (value, path) => { const result = text(value, path); return /^[A-Za-z0-9_-]{1,128}$/.test(result) ? result : fail(path); };
const bool: Parser<boolean> = (value, path) => typeof value === 'boolean' ? value : fail(path);
const number: Parser<number> = (value, path) => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : fail(path);
const integer: Parser<number> = (value, path) => { const result = number(value, path); return Number.isSafeInteger(result) ? result : fail(path); };
const positive: Parser<number> = (value, path) => { const result = integer(value, path); return result > 0 ? result : fail(path); };
const nullableLoad: Parser<number | null> = (value, path) => value === null ? null : number(value, path);
const choice = <const T extends readonly string[]>(values: T): Parser<T[number]> => (value, path) => typeof value === 'string' && values.includes(value) ? value : fail(path);
const mode = choice(['load_reps', 'reps']), convention = choice(['total', 'per_hand', 'per_side']), unit = choice(['lb', 'kg', 'plates']);
const category = choice(['', ...exerciseCategories]), subcategory = choice(['', 'Chest', 'Triceps', 'Shoulders', 'Back', 'Biceps']);
const date: Parser<string> = (value, path) => { const result = text(value, path); try { activityDateValue(result); } catch { fail(path); } return result; };
const instant: Parser<string> = (value, path) => {
  const result = text(value, path);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(result) || !Number.isFinite(Date.parse(result))
    || new Date(result).toISOString().replace('.000Z', 'Z') !== result.replace('.000Z', 'Z')) fail(path);
  return result;
};
const timezone: Parser<string> = (value, path) => { const result = name(value, path); try { new Intl.DateTimeFormat('en', { timeZone: result }).format(0); } catch { fail(path); } return result; };
const record = (value: unknown, path: string): Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : fail(path);
function keys(value: Record<string, unknown>, required: readonly string[], optional: readonly string[], path: string) {
  if (required.some(key => !Object.hasOwn(value, key)) || Object.keys(value).some(key => !required.includes(key) && !optional.includes(key))) fail(`${path} fields`);
}

export const backupRowSchemas = {
  locations: { id, name, kind: choice(['gym', 'home']), archived: bool },
  exercises: { id, name, measurementMode: mode, category, subcategory },
  equipmentVariations: { id, exerciseId: id, locationId: id, name, measurementMode: mode, loadConvention: convention, loadDimension: choice(['mass', 'plates', 'bodyweight']) },
  routines: { id, name, sessionType: choice(sessionTypes), locationId: id, locationNameSnapshot: name },
  routineSlots: { routineId: id, position: integer, exerciseId: id, name, equipment: text, bodyweight: bool, unit, convention, category, subcategory, setCount: positive },
  sessions: { id, activityDate: date, timezone, startedAt: instant, endedAt: instant, locationId: id, locationNameSnapshot: name, locationKindSnapshot: choice(['gym', 'home']), sessionTypeNameSnapshot: name, status: choice(['completed']) },
  sessionExercises: { id, sessionId: id, exerciseId: id, equipmentVariationId: id, position: integer, exerciseNameSnapshot: name, equipmentNameSnapshot: name, bodyweight: bool, loadUnit: unit, loadConvention: convention },
  sets: { id, sessionExerciseId: id, position: integer, loadValue: nullableLoad, reps: positive },
  weeklyGoals: { effectiveWeekStart: date, targetDays: positive },
} as const;
type Schema = Record<string, Parser<unknown>>;
type Parsed<S extends Schema> = { [K in keyof S]: ReturnType<S[K]> };
export type BackupData = { [K in keyof typeof backupRowSchemas]: Parsed<typeof backupRowSchemas[K]>[] } & { draft: WorkoutDraft | null };
export type Backup = { format: 'workout-journal-backup'; formatVersion: 1; exportedAt: string; appVersion: string; data: BackupData };

function parseRow<S extends Schema>(schema: S, value: unknown, path: string): Parsed<S> {
  const row = record(value, path); keys(row, Object.keys(schema), [], path);
  return Object.fromEntries(Object.entries(schema).map(([field, parse]) => [field, parse(row[field], `${path}.${field}`)])) as Parsed<S>;
}
function classified(value: { category?: string; subcategory?: string }, path: string) {
  const allowed: readonly string[] = subcategoriesFor((value.category ?? '') as ExerciseCategory);
  if (value.subcategory && !allowed.includes(value.subcategory)) fail(`${path} subcategory`);
}
function unique<T>(values: T[], key: (value: T) => string, path: string): Map<string, T> {
  const result = new Map<string, T>();
  for (const value of values) { const identity = key(value); if (result.has(identity)) fail(`${path} duplicate identity`); result.set(identity, value); }
  return result;
}
const ref = <T>(values: Map<string, T>, key: string, path: string): T => values.get(key) ?? fail(`${path} missing reference`);
function positions<T>(values: T[], parent: (value: T) => string, position: (value: T) => number, path: string) {
  unique(values, value => `${parent(value)}:${position(value)}`, path);
}

function parseDraft(value: unknown, data: Omit<BackupData, 'draft'>, exportedAt: string): WorkoutDraft | null {
  if (value === null) return null;
  const source = record(value, 'draft');
  keys(source, ['id', 'startedAt', 'activityDate', 'timezone', 'locationId', 'sessionType', 'exercises'], ['endedAt', 'setupComplete', 'timing'], 'draft');
  const draft: WorkoutDraft = { id: id(source.id, 'draft.id'), startedAt: instant(source.startedAt, 'draft.startedAt'), activityDate: date(source.activityDate, 'draft.activityDate'), timezone: timezone(source.timezone, 'draft.timezone'), locationId: text(source.locationId, 'draft.locationId'), sessionType: choice(sessionTypes)(source.sessionType, 'draft.sessionType'), exercises: [] };
  if (data.sessions.some(session => session.id === draft.id) || Date.parse(draft.startedAt) > Date.parse(exportedAt)) fail('draft session identity or time');
  if (draft.activityDate > timeFields(exportedAt, draft.timezone).date) fail('draft future activity date');
  if (draft.locationId && !data.locations.some(location => location.id === draft.locationId)) fail('draft location');
  if (source.endedAt !== undefined) { draft.endedAt = instant(source.endedAt, 'draft.endedAt'); if (Date.parse(draft.endedAt) < Date.parse(draft.startedAt) || Date.parse(draft.endedAt) > Date.parse(exportedAt)) fail('draft end time'); }
  if (source.setupComplete !== undefined) { draft.setupComplete = bool(source.setupComplete, 'draft.setupComplete'); if (draft.setupComplete && !draft.locationId) fail('draft setup location'); }
  if (source.timing !== undefined) {
    const timing = record(source.timing, 'draft.timing'); keys(timing, ['startDate', 'startTime', 'endDate', 'endTime'], [], 'draft.timing');
    const pendingDate = (v: unknown, p: string) => v === '' ? '' : date(v, p);
    const pendingTime = (v: unknown, p: string) => { const result = text(v, p); return result === '' || /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(result) ? result : fail(p); };
    draft.timing = { startDate: pendingDate(timing.startDate, 'draft.startDate'), startTime: pendingTime(timing.startTime, 'draft.startTime'), endDate: pendingDate(timing.endDate, 'draft.endDate'), endTime: pendingTime(timing.endTime, 'draft.endTime') };
  }
  if (!Array.isArray(source.exercises)) fail('draft.exercises');
  const completedExerciseIds = new Set(data.sessionExercises.map(exercise => exercise.id)), completedSetIds = new Set(data.sets.map(set => set.id));
  const draftExerciseIds = new Set<string>(), draftSetIds = new Set<string>(), catalogIds = new Set(data.exercises.map(row => row.id));
  for (const [index, item] of source.exercises.entries()) {
    const path = `draft.exercises[${index}]`, row = record(item, path);
    keys(row, ['id', 'name', 'equipment', 'bodyweight', 'unit', 'convention', 'sets'], ['catalogId', 'category', 'subcategory'], path);
    const exercise: WorkoutDraft['exercises'][number] = { id: id(row.id, path), name: text(row.name, path), equipment: text(row.equipment, path), bodyweight: bool(row.bodyweight, path), unit: unit(row.unit, path), convention: convention(row.convention, path), sets: [] };
    if (completedExerciseIds.has(exercise.id) || draftExerciseIds.has(exercise.id)) fail(`${path} duplicate identity`); draftExerciseIds.add(exercise.id);
    if (row.catalogId !== undefined) { exercise.catalogId = id(row.catalogId, path); if (!catalogIds.has(exercise.catalogId)) fail(`${path} catalog`); }
    if (row.category !== undefined) exercise.category = category(row.category, path);
    if (row.subcategory !== undefined) exercise.subcategory = subcategory(row.subcategory, path);
    classified(exercise, path);
    if (!Array.isArray(row.sets)) fail(`${path}.sets`);
    for (const item of row.sets) {
      const set = parseRow({ id, weight: text, reps: text, completed: bool }, item, `${path}.set`);
      if (completedSetIds.has(set.id) || draftSetIds.has(set.id)) fail(`${path} duplicate set`); draftSetIds.add(set.id);
      if (set.completed && (!exercise.name.trim() || !canCompleteSet(set, exercise.bodyweight))) fail(`${path} completed measurements`);
      exercise.sets.push(set);
    }
    draft.exercises.push(exercise);
  }
  return draft;
}

export function validateBackup(input: unknown): Backup {
  const root = record(input, 'envelope'); keys(root, ['format', 'formatVersion', 'exportedAt', 'appVersion', 'data'], [], 'envelope');
  if (root.format !== 'workout-journal-backup' || root.formatVersion !== 1) throw new Error('This backup format or version is not supported. No data has been changed.');
  const exportedAt = instant(root.exportedAt, 'exportedAt'), appVersion = name(root.appVersion, 'appVersion'), source = record(root.data, 'data');
  keys(source, [...Object.keys(backupRowSchemas), 'draft'], [], 'data');
  const parsed: Record<string, unknown> = {};
  for (const [key, schema] of Object.entries(backupRowSchemas)) {
    const rows = source[key]; if (!Array.isArray(rows)) fail(`data.${key}`);
    parsed[key] = rows.map((row, index) => parseRow(schema, row, `${key}[${index}]`));
  }
  const data = parsed as Omit<BackupData, 'draft'>;
  const locations = unique(data.locations, row => row.id, 'locations'), exercises = unique(data.exercises, row => row.id, 'exercises');
  const equipment = unique(data.equipmentVariations, row => row.id, 'equipment'), sessions = unique(data.sessions, row => row.id, 'sessions');
  const sessionExercises = unique(data.sessionExercises, row => row.id, 'session exercises'), routines = unique(data.routines, row => row.id, 'routines');
  unique(data.sets, row => row.id, 'sets'); unique(data.weeklyGoals, row => row.effectiveWeekStart, 'goals');
  unique(data.routines, row => row.name.replace(/[A-Z]/g, value => value.toLowerCase()), 'routine names');
  positions(data.routineSlots, row => row.routineId, row => row.position, 'routine slots');
  positions(data.sessionExercises, row => row.sessionId, row => row.position, 'session exercise positions');
  positions(data.sets, row => row.sessionExerciseId, row => row.position, 'set positions');
  const home = data.locations.filter(row => row.kind === 'home');
  if (home.length !== 1 || home[0].id !== 'home' || home[0].name !== 'Home' || home[0].archived || data.locations.some(row => row.kind === 'gym' && row.name.toLowerCase() === 'home')) fail('built-in Home');
  if (!data.weeklyGoals.length) fail('weekly goal history');
  for (const goal of data.weeklyGoals) if (goal.targetDays > 7 || periodBounds('week', goal.effectiveWeekStart).start !== goal.effectiveWeekStart) fail('weekly goal');
  for (const exercise of data.exercises) classified(exercise, 'exercise');
  for (const variation of data.equipmentVariations) {
    ref(locations, variation.locationId, 'equipment location');
    const exercise = ref(exercises, variation.exerciseId, 'equipment exercise');
    if (exercise.measurementMode !== variation.measurementMode || (variation.measurementMode === 'reps' ? variation.loadDimension !== 'bodyweight' || variation.loadConvention !== 'total' : variation.loadDimension === 'bodyweight')) fail('equipment measurement mode');
  }
  const populatedRoutines = new Set(data.routineSlots.map(row => row.routineId));
  const populatedSessions = new Set(data.sessionExercises.map(row => row.sessionId));
  const populatedExercises = new Set(data.sets.map(row => row.sessionExerciseId));
  for (const routine of data.routines) { ref(locations, routine.locationId, 'routine location'); if (!populatedRoutines.has(routine.id)) fail('empty routine'); }
  for (const slot of data.routineSlots) {
    ref(routines, slot.routineId, 'routine slot'); const exercise = ref(exercises, slot.exerciseId, 'routine exercise'); classified(slot, 'routine slot');
    if (slot.bodyweight !== (exercise.measurementMode === 'reps') || slot.bodyweight && slot.convention !== 'total') fail('routine measurement mode');
  }
  for (const session of data.sessions) {
    const location = ref(locations, session.locationId, 'session location');
    if (location.kind !== session.locationKindSnapshot || timeFields(session.startedAt, session.timezone).date !== session.activityDate
      || session.activityDate > timeFields(exportedAt, session.timezone).date || Date.parse(session.endedAt) < Date.parse(session.startedAt) || Date.parse(session.endedAt) > Date.parse(exportedAt)) fail('session time or location');
    if (!populatedSessions.has(session.id)) fail('empty completed session');
  }
  for (const exercise of data.sessionExercises) {
    const session = ref(sessions, exercise.sessionId, 'session exercise'), variation = ref(equipment, exercise.equipmentVariationId, 'session equipment'); ref(exercises, exercise.exerciseId, 'session catalog');
    if (variation.exerciseId !== exercise.exerciseId || variation.locationId !== session.locationId || variation.loadConvention !== exercise.loadConvention
      || exercise.bodyweight !== (variation.measurementMode === 'reps') || !exercise.bodyweight && (exercise.loadUnit === 'plates' ? variation.loadDimension !== 'plates' : variation.loadDimension !== 'mass')) fail('session equipment relationship');
    if (!populatedExercises.has(exercise.id)) fail('empty completed exercise');
  }
  for (const set of data.sets) { const exercise = ref(sessionExercises, set.sessionExerciseId, 'set exercise'); if (exercise.bodyweight ? set.loadValue !== null : set.loadValue === null) fail('completed set load'); }
  return { format: 'workout-journal-backup', formatVersion: 1, exportedAt, appVersion, data: { ...data, draft: parseDraft(source.draft, data, exportedAt) } };
}

export function utf8Size(value: string): number {
  let size = 0;
  for (let i = 0; i < value.length; i++) { const code = value.charCodeAt(i); if (code < 0x80) size++; else if (code < 0x800) size += 2; else if (code >= 0xd800 && code <= 0xdbff && value.charCodeAt(i + 1) >= 0xdc00 && value.charCodeAt(i + 1) <= 0xdfff) { size += 4; i++; } else size += 3; }
  return size;
}
export function parseBackup(text: string): Backup {
  if (utf8Size(text) > MAX_BACKUP_BYTES) throw new Error('Backup files must be 50 MiB or smaller. No data has been changed.');
  let input: unknown; try { input = JSON.parse(text.replace(/^\uFEFF/, '')); } catch { throw new Error('This file is not valid JSON. No data has been changed.'); }
  return validateBackup(input);
}
export function backupSummary(data: BackupData) {
  const dates = data.sessions.map(session => session.activityDate).sort();
  return { workouts: data.sessions.length, exercises: data.exercises.length, sets: data.sets.length, routines: data.routines.length, locations: data.locations.length, goals: data.weeklyGoals.length, hasDraft: data.draft !== null, firstDate: dates[0] ?? null, lastDate: dates.at(-1) ?? null };
}
