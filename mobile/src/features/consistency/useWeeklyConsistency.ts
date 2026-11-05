import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import type { WeeklyConsistency } from '../../domain/weeklyGoals';
import { openStore } from '../../storage/openStore';

export function useWeeklyConsistency(today: string) {
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<{ today: string; revision: number; data: WeeklyConsistency | null; error: string }>({ today, revision, data: null, error: '' });
  useFocusEffect(useCallback(() => {
    let active = true;
    const identity = { today, revision };
    setState({ ...identity, data: null, error: '' });
    openStore().then(store => store.getWeeklyConsistency(today)).then(data => { if (active) setState({ ...identity, data, error: '' }); })
      .catch(() => { if (active) setState({ ...identity, data: null, error: 'Unable to load weekly progress. Your workouts have not been changed.' }); });
    return () => { active = false; };
  }, [today, revision]));
  const current = state.today === today && state.revision === revision ? state : { data: null, error: '' };
  return { data: current.data, error: current.error, retry: () => setRevision(value => value + 1) };
}
