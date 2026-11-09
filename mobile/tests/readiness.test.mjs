import { test } from 'node:test';
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { workoutsInMonth } from '../src/domain/workoutCalendar.ts';
import { progressMetrics } from '../src/domain/exerciseProgress.ts';
import { addRoutineToDraft } from '../src/domain/routine.ts';
import { AS_OF, readinessStore, seedReadinessJournal } from './helpers/readinessJournal.mjs';

test('five-year journal stays consistent across calendar, summaries, progress, exports, restore and corrections', async context => {
  const source = readinessStore(), target = readinessStore(), observations = [];
  const measure = async (name, work) => {
    const start = performance.now(), reads = source.readCount(), result = await work();
    observations.push({ name, milliseconds: Math.round(performance.now() - start), reads: source.readCount() - reads }); return result;
  };
  try {
    const { expected, pending } = await seedReadinessJournal(source.store);
    const activeDays = new Set(expected.map(item => item.activityDate)).size, sets = expected.filter(item => !item.recordOnly).length * 18;
    assert.equal(expected.length, 810); assert.equal(activeDays, 780); assert.equal(sets, 12960);
    const history = await measure('history', () => source.store.listWorkouts());
    assert.equal(history.length, expected.length);
    assert.equal(new Set(history.map(item => item.id)).size, expected.length);
    for (const month of ['2021-11', '2024-02', '2026-11']) {
      const calendar = workoutsInMonth(history, month, 'all');
      const summary = await measure(`summary-${month}`, () => source.store.getPeriodSummary('month', `${month}-01`, AS_OF));
      assert.equal(summary.sessions, calendar.length); assert.equal(summary.activeDays, new Set(calendar.map(item => item.activityDate)).size);
      assert.equal(summary.typeCounts.reduce((sum, item) => sum + item.count, 0), summary.sessions);
      assert.equal(summary.locationCounts.gym + summary.locationCounts.home, summary.sessions);
    }
    const first = history.at(-1), day = await source.store.getDayWorkouts(first.activityDate, 'all');
    assert.equal(day.length, 2, 'same-day sessions remain separate');
    const lastDetailed = history.find(item => !item.recordOnly), workout = await source.store.getWorkout(lastDetailed.id);
    for (const [position, unit] of [[0, 'kg'], [3, 'reps'], [4, 'sec'], [5, 'km']]) {
      const progress = await measure(`progress-${unit}`, () => source.store.getExerciseProgress(workout.exercises[position].catalogId, AS_OF));
      assert.ok(progress.variations.length > 0);
      for (const variation of progress.variations) {
        const metrics = progressMetrics(variation, 'kg'); assert.equal(metrics.unit, unit); assert.ok(Number.isFinite(metrics.best));
        assert.ok(metrics.points.length <= 12);
      }
    }
    const csv = await measure('csv', () => source.store.getCsvExport({ kind: 'all' }));
    assert.equal(csv.summary.workouts, expected.length); assert.equal(csv.summary.sets, sets); assert.equal(csv.summary.activeDays, activeDays);
    const text = await measure('json-export', () => source.store.exportBackup('0.1.0')), backup = JSON.parse(text);
    assert.equal(backup.data.sessions.length, expected.length); assert.equal(backup.data.sets.length, sets); assert.deepEqual(backup.data.draft, pending);
    await target.store.initialize();
    const inspection = await target.store.inspectBackup(text); await target.store.restoreBackup(inspection.token, text);
    assert.deepEqual(JSON.parse(await target.store.exportBackup('0.1.0')).data, backup.data, 'restore preserves every saved record, routine, goal, appearance and pending input');
    assert.deepEqual(await target.store.getDraft(), pending);
    const restoredCsv = await target.store.getCsvExport({ kind: 'all' });
    assert.deepEqual(restoredCsv.summary, csv.summary);
    assert.ok(restoredCsv.text === csv.text, 'restore retains byte-identical CSV output');
    const edit = await target.store.getWorkoutEdit(lastDetailed.id);
    edit.timing = { startDate: '2020-12-31', startTime: '09:00', endDate: '2020-12-31', endTime: '10:00' };
    edit.exercises[5].sets[0].distance = '2.5'; await target.store.updateWorkout(edit);
    assert.equal((await target.store.getDayWorkouts('2020-12-31', 'all')).length, 1);
    assert.equal((await target.store.getPeriodSummary('year', '2020-01-01', AS_OF)).sessions, 1);
    assert.equal((await target.store.getCsvExport({ kind: 'range', from: '2020-12-31', to: '2020-12-31' })).summary.sets, 18);
    await target.store.deleteWorkout(lastDetailed.id);
    assert.equal((await target.store.getDayWorkouts('2020-12-31', 'all')).length, 0);
    assert.equal((await target.store.getCsvExport({ kind: 'all' })).summary.workouts, expected.length - 1);
    assert.deepEqual(await target.store.getDraft(), pending);
    const [routine] = await target.store.listRoutines(); let sequence = 0;
    const copy = addRoutineToDraft({ ...pending, id: 'shortened-routine', exercises: [] }, routine, () => `routine-copy-${++sequence}`);
    copy.exercises = [{ ...copy.exercises[0], sets: copy.exercises[0].sets.map(set => ({ ...set, weight: '0', reps: '5', completed: true })) }];
    await target.store.finish(copy);
    assert.equal((await target.store.getWorkout(copy.id)).exercises.length, 1);
    assert.deepEqual(await target.store.listRoutines(), [routine], 'shortening a workout leaves the saved routine unchanged');
    assert.deepEqual(await target.store.getDraft(), pending, 'finishing another session cannot erase a different recoverable draft');
    assert.deepEqual(source.db.prepare('PRAGMA foreign_key_check').all(), []); assert.deepEqual(target.db.prepare('PRAGMA foreign_key_check').all(), []);
    context.diagnostic(JSON.stringify({ fixture: { sessions: expected.length, activeDays, sets, jsonBytes: Buffer.byteLength(text) }, observations }));
  } finally { source.db.close(); target.db.close(); }
});
