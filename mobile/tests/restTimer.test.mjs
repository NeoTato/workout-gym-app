import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readinessStore, fixtureWorkout } from './helpers/readinessJournal.mjs';
import { newRestState, startRest, pauseRest } from '../src/domain/restTimer.ts';

test('rest timer persists without changing journal backups; finish/discard/restore fence stale timer writes', async () => {
  const { db, store } = readinessStore();
  try {
    await store.initialize(); const draft = fixtureWorkout(1, '2026-11-06', 'home'); await store.saveDraft(draft);
    const before = await store.exportBackup('test'), revision = db.prepare('SELECT revision FROM store_metadata').get().revision;
    const timer = startRest(newRestState(draft.id, await store.getRestTimerEpoch()), 'Press / set 1', 1000, 'timer');
    assert.equal(await store.saveRestTimer(timer), true); assert.deepEqual(await store.getRestTimer(), timer);
    const paused = pauseRest(timer, 1250); await store.saveRestTimer(paused); assert.deepEqual(await store.getRestTimer(), paused);
    assert.equal(await store.exportBackup('test'), before); assert.equal(db.prepare('SELECT revision FROM store_metadata').get().revision, revision);
    const inspection = await store.inspectBackup(before); await store.restoreBackup(inspection.token, before);
    assert.equal(await store.getRestTimer(), null); assert.equal(await store.saveRestTimer(timer), false, 'same restored draft ID must not resurrect an old timer');
    const next = startRest(newRestState(draft.id, await store.getRestTimerEpoch()), 'Press', 5000, 'next'); await store.saveRestTimer(next);
    db.exec("CREATE TRIGGER fail_finish BEFORE INSERT ON sets BEGIN SELECT RAISE(ABORT,'injected'); END;");
    await assert.rejects(store.finish(draft), /injected/); assert.deepEqual(await store.getRestTimer(), next); assert.deepEqual(await store.getDraft(), draft);
    db.exec('DROP TRIGGER fail_finish'); await store.finish(draft); assert.equal(await store.getRestTimer(), null); assert.equal(await store.saveRestTimer(next), false);
    const another = fixtureWorkout(2, '2026-11-06', 'home'); await store.saveDraft(another);
    const last = startRest(newRestState(another.id, await store.getRestTimerEpoch()), 'Rest', 5000, 'last'); await store.saveRestTimer(last); await store.discardDraft(another.id);
    assert.equal(await store.getRestTimer(), null); assert.equal(await store.saveRestTimer(last), false);
  } finally { db.close(); }
});

test('schema-nine migration keeps existing workouts and drafts and initializes only transient timer storage', async () => {
  const { db, store } = readinessStore();
  try {
    await store.initialize(); await store.finish(fixtureWorkout(1, '2026-11-06', 'home')); await store.saveDraft(fixtureWorkout(2, '2026-11-06', 'home'));
    const backup = await store.exportBackup('test');
    db.exec('DROP TABLE rest_timer; ALTER TABLE store_metadata DROP COLUMN rest_epoch; PRAGMA user_version=9;');
    await store.initialize(); assert.equal(db.prepare('PRAGMA user_version').get().user_version, 10);
    assert.equal(await store.exportBackup('test'), backup); assert.equal(await store.getRestTimer(), null);
    await assert.rejects(store.saveRestTimer({ ...newRestState('bad'), seconds: 0 }));
  } finally { db.close(); }
});
