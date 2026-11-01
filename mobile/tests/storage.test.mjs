import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createWorkoutStore } from '../src/storage/workoutStore.ts';

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

test('a draft and completed sets survive closing and reopening the real SQLite file', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'workout-storage-'));
  const file = join(directory, 'history.db');
  let connection;
  try {
    connection = connect(file); let store = makeStore(connection); await store.initialize();
    await store.saveDraft(draft()); connection.db.close();
    connection = connect(file); store = makeStore(connection); await store.initialize();
    assert.deepEqual(await store.getDraft(), draft());
    await store.finish(draft()); await store.finish(draft());
    connection.db.close(); connection = connect(file); store = makeStore(connection); await store.initialize();
    const history = await store.listWorkouts(); assert.equal(history.length, 1);
    const saved = await store.getWorkout(history[0].id);
    assert.equal(saved.exercises[0].name, "Press 'n lift");
    assert.deepEqual(saved.exercises[0].sets.map(set => ({ ...set })), [{ id: 'workout-1-set-1', weight: 35.5, reps: 10 }]);
    assert.equal(await store.getDraft(), null);
    await store.saveDraft(draft()); assert.equal(await store.getDraft(), null, 'late autosave cannot resurrect a finished draft');
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
