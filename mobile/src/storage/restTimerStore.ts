import { validateRestState, type RestState } from '../domain/restTimer.ts';
import type { SqlDatabase } from './workoutStore.ts';

export function restTimerOperations(db: SqlDatabase, queue: <T>(work: () => Promise<T>) => Promise<T>) {
  async function epoch() {
    const row = await db.getFirstAsync<{ value: number }>('SELECT rest_epoch AS value FROM store_metadata WHERE singleton=1');
    if (!row || !Number.isSafeInteger(row.value) || row.value < 0) throw new Error('Unable to read the rest timer.');
    return row.value;
  }
  return {
    getRestTimerEpoch: () => queue(epoch),
    getRestTimer: () => queue(async (): Promise<RestState | null> => {
      const row = await db.getFirstAsync<{ sessionId: string; payload: string }>('SELECT session_id AS sessionId,payload FROM rest_timer WHERE singleton=1');
      if (!row) return null;
      if (!await db.getFirstAsync('SELECT session_id FROM draft_checkpoint WHERE session_id=?', row.sessionId)) {
        await db.runAsync('DELETE FROM rest_timer WHERE singleton=1'); return null;
      }
      const state = validateRestState(JSON.parse(row.payload));
      if (state.workoutId !== row.sessionId) throw new Error('Unable to read the saved rest timer.');
      if (state.epoch !== await epoch()) { await db.runAsync('DELETE FROM rest_timer WHERE singleton=1'); return null; }
      return state;
    }),
    saveRestTimer: (value: RestState) => {
      let state: RestState; try { state = JSON.parse(JSON.stringify(validateRestState(value))) as RestState; } catch (error) { return Promise.reject(error); }
      return queue(async () => {
        if (state.epoch !== await epoch()) return false;
        if (!await db.getFirstAsync('SELECT session_id FROM draft_checkpoint WHERE session_id=?', state.workoutId)) return false;
        await db.runAsync('INSERT INTO rest_timer VALUES (1,?,?) ON CONFLICT(singleton) DO UPDATE SET session_id=excluded.session_id,payload=excluded.payload', state.workoutId, JSON.stringify(state));
        return true;
      });
    },
  };
}
