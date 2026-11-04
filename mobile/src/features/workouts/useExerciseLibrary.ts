import { useEffect, useState } from 'react';
import type { LoggedExercise } from '../../domain/exerciseLibrary';
import { openStore } from '../../storage/openStore';

export function useExerciseLibrary() {
  const [items, setItems] = useState<LoggedExercise[]>([]);
  const [loading, setLoading] = useState(true), [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    openStore().then(store => store.listLoggedExercises()).then(value => {
      if (active) { setItems(value); setLoading(false); setError(''); }
    }).catch(() => {
      if (active) { setLoading(false); setError('Suggestions are unavailable. Enter a name or retry.'); }
    });
    return () => { active = false; };
  }, [attempt]);
  function retry() { setLoading(true); setError(''); setAttempt(value => value + 1); }
  return { items, loading, error, retry };
}
