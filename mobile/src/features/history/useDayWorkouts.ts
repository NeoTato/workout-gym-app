import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import type { SavedWorkout } from '../../domain/workout';
import type { LocationFilter } from '../../domain/workoutCalendar';
import { openStore } from '../../storage/openStore';

export function useDayWorkouts(date: string, filter: LocationFilter) {
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<{ date: string; filter: LocationFilter; revision: number; workouts: SavedWorkout[] | null; error: string }>({ date, filter, revision, workouts: null, error: '' });
  useFocusEffect(useCallback(() => {
    let active = true;
    const identity = { date, filter, revision };
    setState({ ...identity, workouts: null, error: '' });
    openStore().then(store => store.getDayWorkouts(date, filter)).then(workouts => { if (active) setState({ ...identity, workouts, error: '' }); })
      .catch(failure => { if (active) setState({ ...identity, workouts: null, error: failure instanceof Error && /valid calendar date|valid location filter/.test(failure.message) ? failure.message : 'Unable to load this day. Your workouts have not been changed. Try again.' }); });
    return () => { active = false; };
  }, [date, filter, revision]));
  const current = state.date === date && state.filter === filter && state.revision === revision ? state : { workouts: null, error: '' };
  return { workouts: current.workouts, error: current.error, retry: () => setRevision(value => value + 1) };
}
