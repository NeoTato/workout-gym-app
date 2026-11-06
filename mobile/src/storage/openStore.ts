import { randomUUID, digestStringAsync, CryptoDigestAlgorithm } from 'expo-crypto';
import { openDatabaseAsync } from 'expo-sqlite';

import { createWorkoutStore, type SqlDatabase, type WorkoutStore } from './workoutStore';

let pending: Promise<WorkoutStore> | null = null;
export function openStore(): Promise<WorkoutStore> {
  if (!pending) pending = (async () => {
    const db = await openDatabaseAsync('workout-journal.db');
    const executor = {
      execAsync: db.execAsync.bind(db), runAsync: db.runAsync.bind(db),
      getFirstAsync: db.getFirstAsync.bind(db), getAllAsync: db.getAllAsync.bind(db),
    };
    const adapter: SqlDatabase = { ...executor, transaction: work => db.withTransactionAsync(() => work(executor)) };
    const store = createWorkoutStore(adapter, randomUUID, () => new Date().toISOString(), text => digestStringAsync(CryptoDigestAlgorithm.SHA256, text));
    try { await store.initialize(); } catch (error) { await db.closeAsync(); throw error; }
    return store;
  })().catch(error => { pending = null; throw error; });
  return pending;
}
