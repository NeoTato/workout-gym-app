import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createWorkoutStore } from '../src/storage/workoutStore.ts';
import { workoutTimes } from '../src/domain/workoutTime.ts';
import { schema } from '../src/storage/schema.ts';
import { addRoutineToDraft } from '../src/domain/routine.ts';

function connect(file) {
  const db = new DatabaseSync(file);
  let fail = false;
  let failRoutine = false;
  const wrap = {
    execAsync: async sql => { db.exec(sql); },
    runAsync: async (sql, ...params) => {
      if (fail && sql.includes('INSERT INTO sets')) throw new Error('Injected write failure');
      if (failRoutine && sql.includes('INSERT INTO routine_slots')) throw new Error('Injected routine failure');
      return db.prepare(sql).run(...params);
    },
    getFirstAsync: async (sql, ...params) => db.prepare(sql).get(...params) ?? null,
    getAllAsync: async (sql, ...params) => db.prepare(sql).all(...params),
  };
  return { db, failSets: () => { fail = true; }, failRoutineSlots: () => { failRoutine = true; }, adapter: { ...wrap, transaction: async fn => {
    db.exec('BEGIN IMMEDIATE');
    try { await fn(wrap); db.exec('COMMIT'); } catch (error) { db.exec('ROLLBACK'); throw error; }
  } } };
}
function draft(id = 'workout-1') {
  return { id, startedAt: '2026-11-01T01:00:00.000Z', activityDate: '2026-11-01', timezone: 'Asia/Manila', locationId: 'home', sessionType: 'Push', exercises: [{
    id: `${id}-exercise`, name: "Press 'n lift", equipment: 'Dumbbells', bodyweight: false, unit: 'lb', convention: 'per_hand', sets: [
      { id: `${id}-set-1`, weight: '35.5', reps: '10', completed: true },
      { id: `${id}-set-2`, weight: '', reps: '', completed: false },
    ],
  }] };
}
let counter = 0;
const digest = async text => createHash('sha256').update(text).digest('hex');
const makeStore = connection => createWorkoutStore(connection.adapter, () => `id-${++counter}`, () => '2026-11-01T02:00:00.000Z', digest);

test('JSON backup round trips all records, original units, archived gyms, goals and unfinished input through reopening', async () => {
  const folder = mkdtempSync(join(tmpdir(), 'workout-backup-')), file = join(folder, 'restored.db');
  const source = connect(':memory:'); let destination = connect(file);
  try {
    const store = makeStore(source); await store.initialize(); const gym = await store.addGym('Gym café 🏋');
    for (const [index, unit] of ['lb', 'kg', 'plates', 'bodyweight'].entries()) {
      const item = draft(`backup-${index}`); item.locationId = gym.id;
      Object.assign(item.exercises[0], { unit: unit === 'bodyweight' ? 'lb' : unit, bodyweight: unit === 'bodyweight', category: 'Push', subcategory: 'Chest' });
      item.exercises[0].sets[0].weight = '0'; await store.finish(item);
    }
    await store.saveWorkoutAsRoutine('backup-0', 'My push'); await store.scheduleWeeklyGoal(5, '2026-11-01'); await store.removeLocation(gym.id);
    const pending = draft('backup-draft'); pending.exercises[0].sets[0] = { id: 'pending-set', weight: 'oops', reps: '', completed: false }; await store.saveDraft(pending);
    const text = await store.exportBackup('0.1.0'), original = JSON.parse(text);
    let restored = makeStore(destination); await restored.initialize(); await restored.finish(draft('will-be-replaced'));
    const inspection = await restored.inspectBackup(text);
    assert.equal(inspection.incoming.workouts, 4); assert.equal(inspection.current.workouts, 1); assert.equal(inspection.incoming.hasDraft, true);
    assert.equal((await restored.listWorkouts()).length, 1, 'inspection must not mutate data');
    await restored.restoreBackup(inspection.token, text);
    assert.deepEqual(JSON.parse(await restored.exportBackup('0.1.0')), original);
    destination.db.close(); destination = connect(file); restored = makeStore(destination); await restored.initialize();
    assert.deepEqual(JSON.parse(await restored.exportBackup('0.1.0')), original);
    assert.deepEqual(await restored.getDraft(), pending);
    assert.equal((await restored.listRoutines())[0].name, 'My push');
    assert.equal((await restored.getWeeklyConsistency('2026-11-02')).currentWeek.targetDays, 5);
    assert.deepEqual(destination.db.prepare('PRAGMA foreign_key_check').all(), []);
  } finally { source.db.close(); destination.db.close(); rmSync(folder, { recursive: true, force: true }); }
});

test('restore refuses changed file bytes, changed local data, reused tokens and malformed graphs', async () => {
  const connection = connect(':memory:');
  try {
    const store = makeStore(connection); await store.initialize(); await store.finish(draft('source'));
    const text = await store.exportBackup('0.1.0');
    const travel = JSON.parse(text);
    travel.exportedAt = '2026-11-01T12:00:00Z';
    Object.assign(travel.data.sessions[0], { timezone: 'Pacific/Kiritimati', activityDate: '2026-11-02', startedAt: '2026-11-01T10:00:00Z', endedAt: '2026-11-01T11:00:00Z' });
    assert.equal((await store.inspectBackup(JSON.stringify(travel))).incoming.firstDate, '2026-11-02', 'recorded timezone can be a day ahead of the importing device');
    let review = await store.inspectBackup(text, 'raw-bytes-1');
    await assert.rejects(store.restoreBackup(review.token, text, 'raw-bytes-2'), /changed/);
    review = await store.inspectBackup(text); await store.saveDraft(draft('new-local-draft'));
    await assert.rejects(store.restoreBackup(review.token, text), /changed/);
    review = await store.inspectBackup(text); await assert.rejects(store.restoreBackup(review.token, text + ' '), /changed/);
    review = await store.inspectBackup(text); await store.restoreBackup(review.token, text);
    await assert.rejects(store.restoreBackup(review.token, text), /changed/);
    const before = await store.exportBackup('0.1.0');
    const mutations = [
      value => { value.data.sets[0].reps = 0; },
      value => { value.data.sets[0].loadValue = null; },
      value => { value.data.sets.push({ ...value.data.sets[0], id: 'duplicate-position' }); },
      value => { value.data.sessionExercises[0].equipmentVariationId = 'missing'; },
      value => { value.data.sessions[0].timezone = 'Not/A_Zone'; },
      value => { value.data.sessions[0].activityDate = '2026-11-02'; },
      value => { value.data.sessions[0].endedAt = '2026-11-02T00:00:00Z'; },
      value => { value.data.equipmentVariations[0].loadDimension = 'bodyweight'; },
      value => { value.data.exercises[0].subcategory = 'Biceps'; },
      value => { value.data.sets = []; },
    ];
    for (const change of mutations) { const value = JSON.parse(text); change(value); await assert.rejects(store.inspectBackup(JSON.stringify(value)), /Invalid backup/); }
    assert.equal(await store.exportBackup('0.1.0'), before);
  } finally { connection.db.close(); }
});

test('a write failure midway through replacement restores the entire prior dataset and revision', async () => {
  const connection = connect(':memory:');
  try {
    const store = makeStore(connection); await store.initialize(); await store.finish(draft('rollback-source'));
    const incoming = await store.exportBackup('0.1.0'); await store.finish(draft('rollback-keep')); await store.saveDraft(draft('rollback-draft'));
    const before = await store.exportBackup('0.1.0'), revision = connection.db.prepare('SELECT revision FROM store_metadata').get().revision;
    const review = await store.inspectBackup(incoming); connection.failSets();
    await assert.rejects(store.restoreBackup(review.token, incoming), /Injected write failure/);
    assert.equal(await store.exportBackup('0.1.0'), before);
    assert.equal(connection.db.prepare('SELECT revision FROM store_metadata').get().revision, revision);
    assert.deepEqual(connection.db.prepare('PRAGMA foreign_key_check').all(), []);
  } finally { connection.db.close(); }
});

test('a valid backup can replace a damaged existing checkpoint without parsing the damaged payload', async () => {
  const connection = connect(':memory:');
  try {
    const store = makeStore(connection); await store.initialize(); const text = await store.exportBackup('0.1.0');
    connection.db.prepare('INSERT INTO draft_checkpoint VALUES (1,?,?)').run('broken', '{broken');
    const review = await store.inspectBackup(text); assert.equal(review.current.hasDraft, true);
    await store.restoreBackup(review.token, text); assert.equal(await store.getDraft(), null);
  } finally { connection.db.close(); }
});

test('version-six migration preserves data and tracks every user table mutation', async () => {
  const connection = connect(':memory:');
  try {
    let store = makeStore(connection); await store.initialize(); await store.finish(draft('version-six')); await store.saveWorkoutAsRoutine('version-six', 'Routine'); await store.saveDraft(draft('six-draft'));
    const before = await store.exportBackup('0.1.0');
    for (const row of connection.db.prepare("SELECT name FROM sqlite_master WHERE type='trigger'").all()) connection.db.exec(`DROP TRIGGER ${row.name}`);
    connection.db.exec('DROP TABLE store_metadata; PRAGMA user_version=6;');
    store = makeStore(connection); await store.initialize(); await store.initialize();
    assert.equal(await store.exportBackup('0.1.0'), before);
    const revision = () => connection.db.prepare('SELECT revision FROM store_metadata').get().revision;
    for (const table of ['locations','exercises','equipment_variations','routines','routine_slots','sessions','session_exercises','sets','weekly_goals','draft_checkpoint']) {
      const column = connection.db.prepare(`PRAGMA table_info(${table})`).all()[0].name, previous = revision();
      connection.db.exec(`UPDATE ${table} SET ${column}=${column}`); assert.ok(revision() > previous, table);
      assert.equal(connection.db.prepare("SELECT count(*) AS n FROM sqlite_master WHERE type='trigger' AND tbl_name=?").get(table).n, 3);
    }
  } finally { connection.db.close(); }
});

test('exercise progress isolates gym, machine, convention, dimension and mode, and refreshes corrections', async () => {
  const connection = connect(':memory:');
  try {
    const store = makeStore(connection); await store.initialize(); const gym = await store.addGym('Progress gym');
    await store.finish(draft('progress-lb'));
    const kg = draft('progress-kg'); kg.exercises[0].unit = 'kg'; kg.exercises[0].sets[0].weight = '20'; await store.finish(kg);
    const otherGym = draft('progress-gym'); otherGym.locationId = gym.id; await store.finish(otherGym);
    const machine = draft('progress-machine'); machine.exercises[0].equipment = 'Machine B'; await store.finish(machine);
    const total = draft('progress-total'); total.exercises[0].convention = 'total'; await store.finish(total);
    const plates = draft('progress-plates'); plates.exercises[0].unit = 'plates'; await store.finish(plates);
    const bodyweight = draft('progress-bodyweight'); bodyweight.exercises[0].bodyweight = true; await store.finish(bodyweight);
    await store.saveDraft(draft('progress-draft')); await store.removeLocation(gym.id);
    const library = await store.listLoggedExercises(), loaded = library.find(item => !item.bodyweight);
    let result = await store.getExerciseProgress(loaded.id);
    assert.equal(result.variations.length, 5);
    const homeMass = result.variations.find(item => item.locationId === 'home' && item.equipment === 'Dumbbells' && item.convention === 'per_hand' && item.dimension === 'mass');
    assert.equal(homeMass.sessions.length, 2); assert.deepEqual(homeMass.sessions.map(item => item.sets[0].unit).sort(), ['kg', 'lb']);
    assert.equal(result.variations.find(item => item.locationId === gym.id).archived, true);
    assert.equal((await store.getExerciseProgress(library.find(item => item.bodyweight).id)).variations[0].bodyweight, true);
    const edit = await store.getWorkoutEdit('progress-kg'); edit.exercises[0].sets[0].weight = '25'; edit.timing = { startDate: '2026-10-31', startTime: '09:00', endDate: '2026-10-31', endTime: '10:00' }; await store.updateWorkout(edit);
    result = await store.getExerciseProgress(loaded.id);
    const corrected = result.variations.flatMap(item => item.sessions).find(item => item.workoutId === 'progress-kg');
    assert.equal(corrected.activityDate, '2026-10-31'); assert.equal(corrected.sets[0].weight, 25);
    await store.deleteWorkout('progress-lb'); await store.deleteWorkout('progress-kg');
    result = await store.getExerciseProgress(loaded.id);
    assert.equal(result.variations.some(item => item.variationId === homeMass.variationId), false);
    assert.deepEqual(await store.getDraft(), draft('progress-draft'));
    await assert.rejects(store.getExerciseProgress('missing'), /not be found/);
  } finally { connection.db.close(); }
});

test('weekly targets schedule next Monday, replace/cancel pending edits, and preserve historical goals and drafts', async () => {
  const connection = connect(':memory:');
  try {
    const store = makeStore(connection); await store.initialize(); await store.saveDraft(draft('goal-draft'));
    let result = await store.getWeeklyConsistency('2026-11-01');
    assert.equal(result.currentWeek.targetDays, 3); assert.equal(result.currentWeek.activeDays, 0);
    await store.scheduleWeeklyGoal(2, '2026-11-01');
    result = await store.getWeeklyConsistency('2026-11-01');
    assert.equal(result.currentWeek.targetDays, 3); assert.equal(result.pendingGoal.effectiveWeekStart, '2026-11-02');
    await store.scheduleWeeklyGoal(4, '2026-11-01'); assert.equal((await store.getWeeklyConsistency('2026-11-01')).pendingGoal.targetDays, 4);
    await store.scheduleWeeklyGoal(3, '2026-11-01'); assert.equal((await store.getWeeklyConsistency('2026-11-01')).pendingGoal, null);
    await store.scheduleWeeklyGoal(2, '2026-11-01'); await store.scheduleWeeklyGoal(5, '2026-11-05');
    assert.equal((await store.getWeeklyConsistency('2026-11-05')).currentWeek.targetDays, 2);
    assert.equal((await store.getWeeklyConsistency('2026-11-01')).currentWeek.targetDays, 3);
    assert.equal(connection.db.prepare('SELECT count(*) AS count FROM weekly_goals').get().count, 3);
    for (const invalid of [0, 8, 1.5, NaN, '3']) await assert.rejects(store.scheduleWeeklyGoal(invalid, '2026-11-05'), /target/i);
    assert.deepEqual(await store.getDraft(), draft('goal-draft'));
  } finally { connection.db.close(); }
});

test('version-five migration preserves workouts, routines and drafts, and goals survive reopening', async () => {
  const folder = mkdtempSync(join(tmpdir(), 'workout-goals-')), file = join(folder, 'workouts.db');
  let connection = connect(file);
  try {
    let store = makeStore(connection); await store.initialize(); await store.finish(draft('goal-source'));
    await store.saveWorkoutAsRoutine('goal-source', 'Preserved routine'); await store.saveDraft(draft('goal-active'));
    connection.db.exec('DROP TABLE weekly_goals; PRAGMA user_version=5;');
    store = makeStore(connection); await store.initialize(); await store.initialize();
    assert.equal((await store.getWorkout('goal-source')).exercises[0].sets[0].reps, 10);
    assert.equal((await store.listRoutines())[0].name, 'Preserved routine');
    await store.scheduleWeeklyGoal(2, '2026-11-01');
    connection.db.close(); connection = connect(file); store = makeStore(connection); await store.initialize();
    assert.equal((await store.getWeeklyConsistency('2026-11-02')).currentWeek.targetDays, 2);
    assert.deepEqual(await store.getDraft(), draft('goal-active'));
  } finally { connection.db.close(); rmSync(folder, { recursive: true, force: true }); }
});

test('backdating and deleting completed workouts recalculates achieved weeks without counting drafts', async () => {
  const connection = connect(':memory:');
  try {
    let now = '2026-11-01T02:00:00.000Z';
    const store = createWorkoutStore(connection.adapter, () => `id-${++counter}`, () => now, digest);
    await store.initialize(); await store.scheduleWeeklyGoal(2, '2026-11-01'); now = '2026-11-05T02:00:00.000Z';
    for (const [index, date] of ['2026-11-02', '2026-11-03', '2026-11-03'].entries()) {
      const item = draft(`streak-${index}`); item.timing = { startDate: date, startTime: '09:00', endDate: date, endTime: '10:00' }; await store.finish(item);
    }
    await store.saveDraft(draft('streak-draft'));
    assert.equal((await store.getWeeklyConsistency('2026-11-05')).currentWeek.activeDays, 2);
    assert.equal((await store.getWeeklyConsistency('2026-11-05')).currentStreak, 1);
    const edit = await store.getWorkoutEdit('streak-0'); edit.timing = { startDate: '2026-10-31', startTime: '09:00', endDate: '2026-10-31', endTime: '10:00' }; await store.updateWorkout(edit);
    assert.equal((await store.getWeeklyConsistency('2026-11-05')).currentStreak, 0);
    assert.equal((await store.getPeriodSummary('month', '2026-11-05', '2026-11-05')).consistency.achievedWeeks, 0);
    await store.deleteWorkout('streak-1');
    assert.equal((await store.getWeeklyConsistency('2026-11-05')).currentWeek.activeDays, 1);
    await store.deleteWorkout('streak-2');
    assert.equal((await store.getWeeklyConsistency('2026-11-05')).currentWeek.activeDays, 0);
    assert.deepEqual(await store.getDraft(), draft('streak-draft'));
  } finally { connection.db.close(); }
});

test('period reports share completed-session counts, deduplicate groups, and recalculate after history edits', async () => {
  const connection = connect(':memory:');
  try {
    const store = makeStore(connection); await store.initialize();
    const gym = await store.addGym('Summary gym');
    const first = draft('report-push'); first.locationId = gym.id; first.exercises[0].category = 'Push'; first.exercises[0].subcategory = 'Chest';
    first.exercises.push({ ...first.exercises[0], id: 'other-chest', name: 'Fly', sets: [{ id: 'fly-set', weight: '20', reps: '12', completed: true }] });
    await store.finish(first);
    const second = draft('report-core'); second.sessionType = 'Core'; second.exercises[0].name = 'Crunches'; second.exercises[0].category = 'Core'; await store.finish(second);
    await store.saveDraft(draft('report-active'));
    const result = await store.getPeriodSummary('month', '2026-11-01', '2026-11-01');
    assert.equal(result.sessions, 2); assert.equal(result.activeDays, 1);
    assert.deepEqual(result.locationCounts, { gym: 1, home: 1 });
    assert.equal(result.typeCounts.find(item => item.name === 'Push').count, 1);
    assert.equal(result.exerciseGroups.find(item => item.name === 'Chest').count, 1);
    const edit = await store.getWorkoutEdit(first.id); edit.timing = { startDate: '2026-10-31', startTime: '09:00', endDate: '2026-10-31', endTime: '10:00' };
    await store.updateWorkout(edit);
    assert.equal((await store.getPeriodSummary('month', '2026-11-01', '2026-11-01')).sessions, 1);
    assert.equal((await store.getPeriodSummary('month', '2026-10-01', '2026-11-01')).sessions, 1);
    await store.deleteWorkout(second.id);
    assert.equal((await store.getPeriodSummary('month', '2026-11-01', '2026-11-01')).sessions, 0);
    assert.equal((await store.getPeriodSummary('year', '2026-11-01', '2026-11-01')).sessions, 1);
    assert.deepEqual(await store.getDraft(), draft('report-active'));
  } finally { connection.db.close(); }
});

test('day details include separate gym/Home sessions, preserve removed gyms, and refresh after backdating/deletion', async () => {
  const connection = connect(':memory:');
  try {
    const store = makeStore(connection); await store.initialize();
    const gym = await store.addGym('Calendar gym');
    const first = draft('calendar-gym'); first.locationId = gym.id; await store.finish(first);
    const second = draft('calendar-home'); second.sessionType = 'Core'; await store.finish(second);
    await store.saveDraft(draft('not-completed'));
    await store.removeLocation(gym.id);
    assert.equal((await store.getDayWorkouts('2026-11-01', 'all')).length, 2);
    assert.equal((await store.getDayWorkouts('2026-11-01', 'gym'))[0].id, first.id);
    assert.equal((await store.getDayWorkouts('2026-11-01', 'home'))[0].id, second.id);
    assert.equal((await store.listWorkouts()).find(item => item.id === first.id).locationKind, 'gym');
    const edit = await store.getWorkoutEdit(first.id); edit.timing = { startDate: '2026-10-31', startTime: '09:00', endDate: '2026-10-31', endTime: '10:00' };
    await store.updateWorkout(edit);
    assert.equal((await store.getDayWorkouts('2026-11-01', 'all')).length, 1);
    assert.equal((await store.getDayWorkouts('2026-10-31', 'all'))[0].id, first.id);
    await store.deleteWorkout(second.id);
    assert.deepEqual(await store.getDayWorkouts('2026-11-01', 'all'), []);
    await assert.rejects(store.getDayWorkouts('2026-02-30', 'all'), /date/);
    await assert.rejects(store.getDayWorkouts('2026-11-01', 'invalid'), /filter/);
    assert.deepEqual(await store.getDraft(), draft('not-completed'));
  } finally { connection.db.close(); }
});

test('version-four migration adds empty routine storage without changing saved workouts or active drafts', async () => {
  const connection = connect(':memory:');
  try {
    let store = makeStore(connection); await store.initialize();
    await store.finish(draft('pre-migration')); await store.saveDraft(draft('active-migration'));
    connection.db.exec('DROP TABLE weekly_goals; DROP TABLE routine_slots; DROP TABLE routines; PRAGMA user_version=4;');
    store = makeStore(connection); await store.initialize(); await store.initialize();
    assert.deepEqual(await store.listRoutines(), []);
    assert.equal((await store.getWorkout('pre-migration')).exercises[0].sets[0].reps, 10);
    assert.deepEqual(await store.getDraft(), draft('active-migration'));
    assert.equal(connection.db.prepare('PRAGMA user_version').get().user_version, 7);
  } finally { connection.db.close(); }
});

test('routine snapshots copy blank independent sets, preserve history, and support explicit replacement/removal', async () => {
  const connection = connect(':memory:');
  try {
    const store = makeStore(connection); await store.initialize(); await store.finish(draft('routine-source'));
    await store.saveDraft(draft('routine-active-draft'));
    const routine = await store.saveWorkoutAsRoutine('routine-source', '  Push A  ');
    assert.equal(routine.name, 'Push A'); assert.equal(routine.exercises[0].setCount, 1);
    const empty = { ...draft('routine-copy'), exercises: [] };
    const copy = addRoutineToDraft(empty, routine, () => `copy-${++counter}`);
    assert.equal(copy.exercises[0].sets[0].weight, ''); assert.equal(copy.exercises[0].sets[0].completed, false);
    copy.exercises[0].sets[0].reps = '99';
    const existing = { ...draft('mixed-routine'), sessionType: 'Core' };
    const mixed = addRoutineToDraft(existing, routine, () => `copy-${++counter}`);
    assert.equal(mixed.sessionType, 'Core'); assert.equal(mixed.exercises.length, 2);
    assert.deepEqual(mixed.exercises[0], existing.exercises[0], 'appending a routine preserves existing performed work');
    assert.equal((await store.getWorkout('routine-source')).exercises[0].sets[0].reps, 10);
    assert.equal((await store.listRoutines())[0].exercises[0].setCount, 1);
    const gym = await store.addGym('Another gym');
    assert.equal(addRoutineToDraft({ ...empty, locationId: gym.id }, routine, () => `copy-${++counter}`).exercises[0].equipment, '');
    await assert.rejects(store.saveWorkoutAsRoutine('routine-source', 'push a'), /name/i);
    await store.renameRoutine(routine.id, 'Push B');
    const edit = await store.getWorkoutEdit('routine-source'); edit.exercises[0].name = 'Modified press'; await store.updateWorkout(edit);
    assert.notEqual((await store.listRoutines())[0].exercises[0].name, 'Modified press');
    await store.saveWorkoutAsRoutine('routine-source', 'Push B', routine.id);
    assert.equal((await store.listRoutines())[0].exercises[0].name, 'Modified press');
    connection.failRoutineSlots();
    await assert.rejects(store.saveWorkoutAsRoutine('routine-source', 'Failed replacement', routine.id), /Injected routine/);
    assert.equal((await store.listRoutines())[0].name, 'Push B', 'failed replacement rolls back both name and slots');
    assert.equal((await store.listRoutines())[0].exercises[0].name, 'Modified press');
    await store.deleteWorkout('routine-source'); assert.equal((await store.listRoutines()).length, 1);
    await store.removeRoutine(routine.id); assert.deepEqual(await store.listRoutines(), []);
    assert.deepEqual(await store.getDraft(), draft('routine-active-draft'), 'routine operations preserve the unrelated active draft');
  } finally { connection.db.close(); }
});

test('previous sets match exact gym/equipment/mode/convention/dimension across session types', async () => {
  const connection = connect(':memory:');
  try {
    const store = makeStore(connection); await store.initialize();
    const gym = await store.addGym('Other gym');
    const save = async (id, patch = {}) => {
      const entry = draft(id); entry.startedAt = '2026-10-31T01:00:00Z'; entry.endedAt = '2026-10-31T01:30:00Z'; entry.activityDate = '2026-10-31';
      Object.assign(entry, patch.session ?? {}); Object.assign(entry.exercises[0], patch.exercise ?? {});
      await store.finish(entry); return entry;
    };
    const matching = await save('matching', { session: { sessionType: 'Upper' } });
    await save('other-gym', { session: { locationId: gym.id, sessionType: 'Upper' } });
    await save('later-same-day', { session: { sessionType: 'Upper', activityDate: '2026-11-01', startedAt: '2026-11-01T01:30:00Z', endedAt: '2026-11-01T01:40:00Z' } });
    await save('other-machine', { exercise: { equipment: 'Machine 2' } });
    await save('other-convention', { exercise: { convention: 'total' } });
    await save('plates', { exercise: { unit: 'plates' } });
    await save('bodyweight', { exercise: { bodyweight: true } });
    await store.saveDraft(draft('unfinished-reference'));
    const context = { locationId: 'home', activityDate: '2026-11-01', startedAt: '2026-11-01T01:00:00Z', excludeSessionId: 'active' };
    const result = await store.getPreviousExercise(context, draft().exercises[0]);
    assert.equal(result.workoutId, matching.id); assert.equal(result.sessionType, 'Upper');
    assert.equal(result.exercise.sets[0].weight, 35.5);
    assert.equal((await store.getPreviousExercise(context, { ...draft().exercises[0], unit: 'kg' })).workoutId, matching.id, 'mass units share a dimension and retain recorded values');
    assert.equal(await store.getPreviousExercise({ ...context, activityDate: '2026-10-30' }, draft().exercises[0]), null);
    assert.equal(await store.getPreviousExercise({ ...context, excludeSessionId: matching.id }, draft().exercises[0]), null);
    const recent = await store.getRecentSessions(context, 'Upper');
    assert.deepEqual(recent.map(item => item.id), [matching.id], 'recent sessions exclude other gyms and later same-day work');
    assert.deepEqual(await store.getDraft(), draft('unfinished-reference'));
  } finally { connection.db.close(); }
});

test('all supported categories and muscle groups persist into completed workout details', async () => {
  const connection = connect(':memory:');
  try {
    const store = makeStore(connection); await store.initialize();
    const cases = [
      ['', ''], ['Push', ''], ['Push', 'Chest'], ['Push', 'Triceps'], ['Push', 'Shoulders'],
      ['Pull', ''], ['Pull', 'Back'], ['Pull', 'Biceps'], ['Legs', ''], ['Core', ''],
      ['Cardio', ''], ['Mobility', ''], ['Other', ''],
    ];
    for (const [index, [category, subcategory]] of cases.entries()) {
      const entry = draft(`classification-${index}`);
      entry.exercises[0].name = `Exercise ${index}`;
      entry.exercises[0].category = category; entry.exercises[0].subcategory = subcategory;
      await store.finish(entry);
      const saved = (await store.getWorkout(entry.id)).exercises[0];
      assert.equal(saved.category, category); assert.equal(saved.subcategory, subcategory);
    }
    assert.equal((await store.listLoggedExercises()).length, cases.length);
  } finally { connection.db.close(); }
});

test('push and pull subcategories persist in suggestions and completed workouts and reject mismatched parents', async () => {
  const connection = connect(':memory:');
  try {
    const store = makeStore(connection); await store.initialize();
    const entry = draft('subcategorized'); entry.exercises[0].category = 'Push'; entry.exercises[0].subcategory = 'Chest';
    await store.finish(entry);
    assert.equal((await store.listLoggedExercises())[0].subcategory, 'Chest');
    assert.equal((await store.getWorkout(entry.id)).exercises[0].subcategory, 'Chest');
    const edit = await store.getWorkoutEdit(entry.id); edit.exercises[0].category = 'Pull'; edit.exercises[0].subcategory = 'Back';
    await store.updateWorkout(edit);
    assert.equal((await store.getWorkout(entry.id)).exercises[0].subcategory, 'Back');
    const invalid = await store.getWorkoutEdit(entry.id); invalid.exercises[0].subcategory = 'Chest';
    await assert.rejects(store.updateWorkout(invalid), /subcategory/);
    assert.equal((await store.listLoggedExercises())[0].subcategory, 'Back');
    const legacy = draft('legacy-category-change'); legacy.exercises[0].category = 'Core';
    await store.finish(legacy);
    assert.equal((await store.listLoggedExercises())[0].subcategory, '');
  } finally { connection.db.close(); }
});

test('exercise categories persist, can be reassigned or cleared, and roll back with failed workout edits', async () => {
  const connection = connect(':memory:');
  try {
    const store = makeStore(connection); await store.initialize();
    const entry = draft('categorized'); entry.exercises[0].category = 'Push';
    await store.finish(entry);
    assert.equal((await store.listLoggedExercises())[0].category, 'Push');
    const edit = await store.getWorkoutEdit(entry.id);
    assert.equal(edit.exercises[0].category, 'Push');
    edit.exercises[0].category = 'Core';
    await store.updateWorkout(edit);
    assert.equal((await store.listLoggedExercises())[0].category, 'Core');
    const uncategorized = await store.getWorkoutEdit(entry.id); uncategorized.exercises[0].category = '';
    await store.updateWorkout(uncategorized);
    assert.equal((await store.listLoggedExercises())[0].category, '');
    const invalid = await store.getWorkoutEdit(entry.id); invalid.exercises[0].category = 'unknown';
    await assert.rejects(store.updateWorkout(invalid), /category/);
    const failed = await store.getWorkoutEdit(entry.id); failed.exercises[0].category = 'Pull'; failed.exercises[0].subcategory = 'Back';
    connection.failSets();
    await assert.rejects(store.updateWorkout(failed), /Injected/);
    assert.equal((await store.listLoggedExercises())[0].category, '');
    assert.equal((await store.listLoggedExercises())[0].subcategory, '');
    assert.equal((await store.getWorkout(entry.id)).sessionType, 'Push');
  } finally { connection.db.close(); }
});

test('version-one locations migrate without losing gyms or draft checkpoints', async () => {
  const connection = connect(':memory:');
  try {
    connection.db.exec(schema);
    connection.db.prepare('INSERT INTO locations VALUES (?,?,?)').run('legacy', 'Legacy gym', 'gym');
    const pending = draft(); pending.locationId = 'legacy';
    connection.db.prepare('INSERT INTO draft_checkpoint VALUES (1,?,?)').run(pending.id, JSON.stringify(pending));
    const store = makeStore(connection); await store.initialize(); await store.initialize();
    assert.equal(connection.db.prepare('PRAGMA user_version').get().user_version, 7);
    assert.equal((await store.listLocations()).find(item => item.id === 'legacy').archived, 0);
    assert.deepEqual(await store.getDraft(), pending);
  } finally { connection.db.close(); }
});

test('version-two exercise names migrate as uncategorized and retain their identity', async () => {
  const connection = connect(':memory:');
  try {
    connection.db.exec(schema);
    connection.db.exec('ALTER TABLE locations ADD COLUMN archived INTEGER NOT NULL DEFAULT 0; PRAGMA user_version=2;');
    connection.db.prepare('INSERT INTO exercises VALUES (?,?,?)').run('legacy-press', "Press 'n lift", 'load_reps');
    const store = makeStore(connection); await store.initialize(); await store.initialize();
    const entry = draft('legacy-history'); await store.finish(entry);
    assert.equal((await store.listLoggedExercises())[0].id, 'legacy-press');
    assert.equal((await store.listLoggedExercises())[0].category, '');
    assert.equal((await store.getWorkout(entry.id)).exercises[0].sets[0].weight, 35.5);
  } finally { connection.db.close(); }
});

test('version-three categories survive migration with unassigned subcategories', async () => {
  const connection = connect(':memory:');
  try {
    connection.db.exec(schema);
    connection.db.exec("ALTER TABLE locations ADD COLUMN archived INTEGER NOT NULL DEFAULT 0; ALTER TABLE exercises ADD COLUMN category TEXT NOT NULL DEFAULT ''; PRAGMA user_version=3;");
    connection.db.prepare('INSERT INTO exercises VALUES (?,?,?,?)').run('legacy-push', "Press 'n lift", 'load_reps', 'Push');
    const store = makeStore(connection); await store.initialize(); await store.initialize();
    await store.finish(draft('legacy-push-history'));
    const exercise = (await store.listLoggedExercises())[0];
    assert.equal(exercise.id, 'legacy-push'); assert.equal(exercise.category, 'Push'); assert.equal(exercise.subcategory, '');
  } finally { connection.db.close(); }
});

test('removing a gym preserves history and drafts, and adding it again restores its identity', async () => {
  const connection = connect(':memory:');
  try {
    const store = makeStore(connection); await store.initialize();
    const gym = await store.addGym('Old gym');
    const entry = draft('gym-history'); entry.locationId = gym.id;
    await store.finish(entry);
    const pending = draft('pending'); pending.locationId = gym.id; await store.saveDraft(pending);
    await store.removeLocation(gym.id);
    assert.equal((await store.listLocations()).find(item => item.id === gym.id).archived, 1);
    assert.equal((await store.getWorkout(entry.id)).locationName, 'Old gym');
    assert.deepEqual(await store.getDraft(), pending);
    const edit = await store.getWorkoutEdit(entry.id); await store.updateWorkout(edit);
    await assert.rejects(store.removeLocation('home'), /Home/);
    const restored = await store.addGym('OLD GYM'); assert.equal(restored.id, gym.id);
    assert.equal((await store.listLocations()).find(item => item.id === gym.id).archived, 0);
    await store.initialize();
    assert.equal((await store.listWorkouts()).length, 1);
  } finally { connection.db.close(); }
});

test('logged exercise suggestions reuse names without mixing gym equipment or unfinished drafts', async () => {
  const connection = connect(':memory:');
  try {
    const store = makeStore(connection); await store.initialize();
    assert.deepEqual(await store.listLoggedExercises(), []);
    await store.saveDraft(draft('unfinished'));
    assert.deepEqual(await store.listLoggedExercises(), []);
    const first = draft('first'); first.exercises[0].name = "  Press   'n lift  "; await store.finish(first);
    const gym = await store.addGym('Gym A');
    const second = draft('second'); second.locationId = gym.id; second.exercises[0].name = "press 'n LIFT"; await store.finish(second);
    const suggestions = await store.listLoggedExercises();
    assert.equal(suggestions.length, 1); assert.equal(suggestions[0].name, "Press 'n lift"); assert.equal(suggestions[0].bodyweight, false);
    assert.equal(connection.db.prepare('SELECT count(*) AS count FROM exercises').get().count, 1);
    assert.equal(connection.db.prepare('SELECT count(*) AS count FROM equipment_variations').get().count, 2);
    const bodyweight = draft('bodyweight'); bodyweight.exercises[0].bodyweight = true; await store.finish(bodyweight);
    assert.equal((await store.listLoggedExercises()).length, 2, 'bodyweight and loaded tracking remain distinct');
    await store.deleteWorkout('first'); await store.deleteWorkout('second');
    assert.equal((await store.listLoggedExercises()).length, 1, 'unreferenced catalog entries are not presented as logged history');
    assert.deepEqual(await store.getDraft(), draft('unfinished'));
  } finally { connection.db.close(); }
});

test('time conversion uses the recorded timezone and rejects nonexistent daylight-saving times', () => {
  const entry = draft(); entry.timezone = 'America/New_York';
  entry.timing = { startDate: '2026-03-08', startTime: '01:30', endDate: '2026-03-08', endTime: '03:30' };
  const times = workoutTimes(entry, '2026-11-01T02:00:00Z');
  assert.equal(Date.parse(times.endedAt) - Date.parse(times.startedAt), 3600000);
  assert.throws(() => workoutTimes({ ...entry, timing: { ...entry.timing, startTime: '02:30' } }, '2026-11-01T02:00:00Z'), /valid/);
});

test('backdated logging and time corrections persist, while invalid timing preserves history', async () => {
  const connection = connect(':memory:');
  try {
    const store = makeStore(connection); await store.initialize();
    const entry = draft();
    entry.timing = { startDate: '2026-10-31', startTime: '18:00', endDate: '2026-10-31', endTime: '19:00' };
    await store.finish(entry);
    const saved = await store.getWorkout(entry.id);
    assert.equal(saved.activityDate, '2026-10-31');
    assert.equal(saved.startedAt, '2026-10-31T10:00:00.000Z');
    assert.equal(saved.endedAt, '2026-10-31T11:00:00.000Z');
    const edit = await store.getWorkoutEdit(entry.id);
    assert.equal(edit.endedAt, saved.endedAt);
    edit.timing = { startDate: '2026-10-30', startTime: '23:30', endDate: '2026-10-31', endTime: '00:30' };
    await store.updateWorkout(edit);
    const corrected = await store.getWorkout(entry.id);
    assert.equal(corrected.activityDate, '2026-10-30');
    assert.equal(Date.parse(corrected.endedAt) - Date.parse(corrected.startedAt), 3600000);
    for (const timing of [
      { ...edit.timing, startDate: '2026-02-30' },
      { ...edit.timing, startTime: '25:00' },
      { ...edit.timing, endDate: '2026-10-29' },
      { ...edit.timing, endDate: '2026-11-02' },
    ]) {
      await assert.rejects(store.updateWorkout({ ...edit, timing }), /Enter/);
      assert.deepEqual(await store.getWorkout(entry.id), corrected);
    }
  } finally { connection.db.close(); }
});

test('edits are explicit, preserve history metadata and drafts, and roll back on failure', async () => {
  const connection = connect(':memory:');
  try {
    const store = makeStore(connection); await store.initialize(); await store.finish(draft());
    const original = await store.getWorkout('workout-1');
    await store.saveDraft(draft('ongoing'));
    const edit = await store.getWorkoutEdit('workout-1');
    edit.sessionType = 'Upper'; edit.exercises[0].sets[0].weight = '45';
    assert.deepEqual(await store.getWorkout('workout-1'), original);
    await store.updateWorkout(edit);
    const saved = await store.getWorkout('workout-1');
    assert.equal(saved.sessionType, 'Upper'); assert.equal(saved.exercises[0].sets[0].weight, 45);
    assert.equal(saved.startedAt, original.startedAt); assert.equal(saved.endedAt, original.endedAt);
    assert.equal(saved.activityDate, original.activityDate);
    assert.deepEqual(await store.getDraft(), draft('ongoing'));
    edit.exercises[0].sets[0].weight = '55'; connection.failSets();
    await assert.rejects(store.updateWorkout(edit), /Injected/);
    assert.deepEqual(await store.getWorkout('workout-1'), saved);
    assert.deepEqual(connection.db.prepare('PRAGMA foreign_key_check').all(), []);
  } finally { connection.db.close(); }
});

test('delete affects only one workout and stale edits cannot recreate it', async () => {
  const connection = connect(':memory:');
  try {
    const store = makeStore(connection); await store.initialize();
    await store.finish(draft()); await store.finish(draft('other')); await store.saveDraft(draft('ongoing'));
    const edit = await store.getWorkoutEdit('workout-1');
    edit.exercises[0].sets[0].reps = '0';
    await assert.rejects(store.updateWorkout(edit), /reps/);
    assert.equal((await store.getWorkout('workout-1')).exercises[0].sets[0].reps, 10);
    edit.exercises[0].sets[0].reps = '12';
    await store.deleteWorkout('workout-1'); await store.deleteWorkout('workout-1');
    await assert.rejects(store.updateWorkout(edit), /found/);
    assert.deepEqual((await store.listWorkouts()).map(w => w.id), ['other']);
    assert.equal(connection.db.prepare('SELECT count(*) AS count FROM sets').get().count, 1);
    assert.deepEqual(await store.getDraft(), draft('ongoing'));
  } finally { connection.db.close(); }
});

test('a draft and completed sets survive closing and reopening the real SQLite file', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'workout-storage-'));
  const file = join(directory, 'history.db');
  let connection;
  try {
    connection = connect(file); let store = makeStore(connection); await store.initialize();
    await store.saveDraft({ ...draft(), setupComplete: true }); connection.db.close();
    connection = connect(file); store = makeStore(connection); await store.initialize();
    assert.deepEqual(await store.getDraft(), { ...draft(), setupComplete: true });
    const categorized = draft(); categorized.exercises[0].category = 'Push'; categorized.exercises[0].subcategory = 'Chest';
    await store.finish(categorized); await store.finish(categorized);
    await store.saveWorkoutAsRoutine(categorized.id, 'Durable routine');
    connection.db.close(); connection = connect(file); store = makeStore(connection); await store.initialize();
    const history = await store.listWorkouts(); assert.equal(history.length, 1);
    const saved = await store.getWorkout(history[0].id);
    assert.equal((await store.listLoggedExercises())[0].id, saved.exercises[0].catalogId, 'saved suggestions preserve catalog identity after reopening');
    assert.equal((await store.listLoggedExercises())[0].category, 'Push', 'categories persist after reopening the database');
    assert.equal((await store.getWorkout(saved.id)).exercises[0].subcategory, 'Chest', 'completed subcategories persist after reopening');
    assert.equal((await store.listRoutines())[0].name, 'Durable routine', 'routine snapshots survive reopening the real file');
    assert.equal(saved.exercises[0].name, "Press 'n lift");
    assert.deepEqual(saved.exercises[0].sets.map(set => ({ ...set })), [{ id: 'workout-1-set-1', weight: 35.5, reps: 10 }]);
    assert.equal(await store.getDraft(), null);
    await store.saveDraft(draft()); assert.equal(await store.getDraft(), null, 'late autosave cannot resurrect a finished draft');
    const edit = await store.getWorkoutEdit(saved.id);
    edit.exercises[0].sets[0].reps = '12';
    edit.timing = { startDate: '2026-10-31', startTime: '09:00', endDate: '2026-10-31', endTime: '10:00' };
    await store.updateWorkout(edit);
    connection.db.close(); connection = connect(file); store = makeStore(connection); await store.initialize();
    assert.equal((await store.getWorkout(saved.id)).exercises[0].sets[0].reps, 12, 'edits persist after reopening the file');
    assert.equal((await store.getWorkout(saved.id)).activityDate, '2026-10-31', 'corrected date persists after reopening');
    await store.deleteWorkout(saved.id);
    connection.db.close(); connection = connect(file); store = makeStore(connection); await store.initialize();
    assert.equal((await store.listWorkouts()).length, 0, 'deletion persists after reopening the file');
  } finally { connection?.db.close(); rmSync(directory, { recursive: true, force: true }); }
});

test('a failed finish rolls back all rows and retains the recoverable draft', async () => {
  const connection = connect(':memory:');
  try {
    const store = makeStore(connection); await store.initialize(); await store.saveDraft(draft()); connection.failSets();
    await assert.rejects(store.finish(draft()), /Injected/);
    assert.equal((await store.listWorkouts()).length, 0);
    assert.deepEqual(await store.getDraft(), draft());
    assert.equal(connection.db.prepare('SELECT count(*) AS count FROM session_exercises').get().count, 0);
  } finally { connection.db.close(); }
});

test('equipment is distinct across gyms and bodyweight values do not invent a load', async () => {
  const connection = connect(':memory:');
  try {
    const store = makeStore(connection); await store.initialize();
    const a = await store.addGym('Gym A'), b = await store.addGym('Gym B');
    const first = draft('first'); first.locationId = a.id; await store.finish(first);
    const second = draft('second'); second.locationId = b.id; await store.finish(second);
    assert.equal(connection.db.prepare('SELECT count(*) AS count FROM equipment_variations').get().count, 2);
    const third = draft('third'); third.exercises[0].bodyweight = true; third.exercises[0].sets[0].weight = '';
    await store.finish(third); assert.equal((await store.getWorkout(third.id)).exercises[0].sets[0].weight, null);
    assert.deepEqual(connection.db.prepare('PRAGMA foreign_key_check').all(), []);
  } finally { connection.db.close(); }
});

test('invalid completed measurements never create history and future schema versions are preserved', async () => {
  const connection = connect(':memory:');
  try {
    const store = makeStore(connection); await store.initialize();
    for (const reps of ['', '0', '1.5', '-2', 'Infinity']) {
      const entry = draft(); entry.exercises[0].sets[0].reps = reps;
      await assert.rejects(store.finish(entry), /reps/);
    }
    assert.equal((await store.listWorkouts()).length, 0);
    connection.db.exec('PRAGMA user_version=99');
    await assert.rejects(makeStore(connection).initialize(), /newer/);
    assert.equal(connection.db.prepare('PRAGMA user_version').get().user_version, 99);
  } finally { connection.db.close(); }
});
