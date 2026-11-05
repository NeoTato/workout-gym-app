import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createWorkoutStore } from '../src/storage/workoutStore.ts';
import { workoutTimes } from '../src/domain/workoutTime.ts';
import { schema } from '../src/storage/schema.ts';

function connect(file) {
  const db = new DatabaseSync(file);
  let fail = false;
  const wrap = {
    execAsync: async sql => { db.exec(sql); },
    runAsync: async (sql, ...params) => {
      if (fail && sql.includes('INSERT INTO sets')) throw new Error('Injected write failure');
      return db.prepare(sql).run(...params);
    },
    getFirstAsync: async (sql, ...params) => db.prepare(sql).get(...params) ?? null,
    getAllAsync: async (sql, ...params) => db.prepare(sql).all(...params),
  };
  return { db, failSets: () => { fail = true; }, adapter: { ...wrap, transaction: async fn => {
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
const makeStore = connection => createWorkoutStore(connection.adapter, () => `id-${++counter}`, () => '2026-11-01T02:00:00.000Z');

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
    assert.equal(connection.db.prepare('PRAGMA user_version').get().user_version, 4);
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
    connection.db.close(); connection = connect(file); store = makeStore(connection); await store.initialize();
    const history = await store.listWorkouts(); assert.equal(history.length, 1);
    const saved = await store.getWorkout(history[0].id);
    assert.equal((await store.listLoggedExercises())[0].id, saved.exercises[0].catalogId, 'saved suggestions preserve catalog identity after reopening');
    assert.equal((await store.listLoggedExercises())[0].category, 'Push', 'categories persist after reopening the database');
    assert.equal((await store.getWorkout(saved.id)).exercises[0].subcategory, 'Chest', 'completed subcategories persist after reopening');
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
