import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { openStore } from '../../storage/openStore';

function useProgressQuery<T>(identity: string, load: () => Promise<T>) {
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<{ identity: string; revision: number; data: T | null; error: string; refreshing: boolean }>({ identity, revision, data: null, error: '', refreshing: true });
  useFocusEffect(useCallback(() => {
    let active = true;
    setState(previous => ({ identity, revision, data: previous.identity === identity ? previous.data : null, error: '', refreshing: true }));
    load().then(data => { if (active) setState({ identity, revision, data, error: '', refreshing: false }); })
      .catch(() => { if (active) setState({ identity, revision, data: null, error: 'Unable to load exercise history. Your workouts have not been changed. Try again.', refreshing: false }); });
    return () => { active = false; };
  }, [identity, load, revision]));
  const current = state.identity === identity && state.revision === revision ? state : { data: null, error: '', refreshing: true };
  return { data: current.data, error: current.error, refreshing: current.refreshing, retry: () => setRevision(value => value + 1) };
}
const loadLibrary = async () => (await openStore()).listLoggedExercises();
export function useProgressLibrary() { return useProgressQuery('library', loadLibrary); }
export function useExerciseProgress(id: string, today: string) {
  const load = useCallback(async () => (await openStore()).getExerciseProgress(id, today), [id, today]);
  return useProgressQuery(`${id}:${today}`, load);
}
