import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
import { createWorkoutStore } from '../../src/storage/workoutStore.ts';

export const AS_OF = '2026-11-09';
export function readinessStore() {
  const db = new DatabaseSync(':memory:');
  let sequence = 0, reads = 0;
  const executor = {
    execAsync: async sql => { db.exec(sql); },
    runAsync: async (sql, ...params) => db.prepare(sql).run(...params),
    getFirstAsync: async (sql, ...params) => { reads++; return db.prepare(sql).get(...params) ?? null; },
    getAllAsync: async (sql, ...params) => { reads++; return db.prepare(sql).all(...params); },
  };
  const adapter = { ...executor, transaction: async work => {
    db.exec('BEGIN IMMEDIATE');
    try { await work(executor); db.exec('COMMIT'); }
    catch (error) { db.exec('ROLLBACK'); throw error; }
  } };
  const store = createWorkoutStore(adapter, () => `readiness-${++sequence}`, () => `${AS_OF}T12:00:00.000Z`, async text => createHash('sha256').update(text).digest('hex'));
  return { db, store, readCount: () => reads };
}

export function fixtureWorkout(index, date, locationId, recordOnly = false) {
  const id = `fixture-${index}`;
  const exercises = [
    { name: 'Fixture press', category: 'Push', subcategory: 'Chest', unit: index % 2 ? 'lb' : 'kg', convention: 'total' },
    { name: 'Fixture dumbbell press', category: 'Push', subcategory: 'Shoulders', unit: 'kg', convention: 'per_hand' },
    { name: 'Fixture cable row', category: 'Pull', subcategory: 'Back', unit: 'plates', convention: 'total' },
    { name: 'Fixture crunch', category: 'Core', bodyweight: true },
    { name: 'Fixture plank', category: 'Core', tracking: 'duration' },
    { name: 'Fixture run', category: 'Cardio', tracking: 'distance_duration' },
  ].map((exercise, position) => ({
    id: `${id}-exercise-${position}`, equipment: position === 0 ? 'Bench A' : '', bodyweight: false, unit: 'lb', convention: 'total', ...exercise,
    sets: Array.from({ length: 3 }, (_, set) => ({ id: `${id}-set-${position}-${set}`, weight: String(set === 0 ? 0 : 20 + index % 20), reps: '10', completed: true,
      ...(exercise.tracking ? { weight: '', reps: '', duration: String(45 + set * 15), ...(exercise.tracking === 'distance_duration' ? { distance: '1.25' } : {}) } : {}),
    })),
  }));
  return { id, activityDate: date, timezone: 'Asia/Manila', startedAt: `${date}T01:00:00.000Z`, endedAt: `${date}T02:00:00.000Z`,
    locationId, sessionType: ['Push', 'Pull', 'Legs'][index % 3], recordOnly, exercises: recordOnly ? [] : exercises };
}

export async function seedReadinessJournal(store) {
  await store.initialize();
  const gym = await store.addGym('Fixture gym');
  const expected = [];
  for (let week = 0; week < 260; week++) for (const offset of [0, 2, 4]) {
    const index = week * 3 + offset / 2, date = new Date('2021-11-15T12:00:00Z'); date.setUTCDate(date.getUTCDate() + week * 7 + offset);
    const draft = fixtureWorkout(index, date.toISOString().slice(0, 10), index % 2 ? gym.id : 'home', index % 13 === 0);
    await store.finish(draft); expected.push(draft);
    if (index % 26 === 0) {
      const extra = fixtureWorkout(`extra-${index}`, draft.activityDate, 'home', true); extra.sessionType = 'Core';
      await store.finish(extra); expected.push(extra);
    }
  }
  await store.removeLocation(gym.id);
  await store.saveWorkoutAsRoutine('fixture-779', 'Fixture full session');
  await store.scheduleWeeklyGoal(4, AS_OF);
  await store.setAppearance('dark');
  const pending = fixtureWorkout(1000, '2026-11-06', 'home');
  pending.exercises = [{ ...pending.exercises[5], sets: [{ id: 'pending-set', weight: '', reps: '', duration: 'unfinished', distance: '', completed: false }] }];
  await store.saveDraft(pending);
  return { expected, pending };
}
