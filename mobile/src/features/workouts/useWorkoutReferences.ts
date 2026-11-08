import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import type { ReferenceContext, ReferenceExercise } from '../../domain/workoutReferences';
import { openStore } from '../../storage/openStore';

function useFocusedReference<T>(load: () => Promise<T>, enabled: boolean) {
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<{ query: () => Promise<T>; revision: number; data?: T; error: string; loading: boolean }>({ query: load, revision, error: '', loading: enabled });
  useFocusEffect(useCallback(() => {
    let active = true; setResult({ query: load, revision, error: '', loading: enabled });
    if (enabled) load().then(data => { if (active) setResult({ query: load, revision, data, error: '', loading: false }); })
      .catch(() => { if (active) setResult({ query: load, revision, error: 'Unable to load previous workouts. Try again.', loading: false }); });
    return () => { active = false; };
  }, [load, enabled, revision]));
  const current = result.query === load && result.revision === revision ? result : { data: undefined, error: '', loading: enabled };
  return { data: current.data, error: current.error, loading: current.loading, retry: () => setRevision(value => value + 1) };
}

export function useRecentSessions(context: ReferenceContext | null, sessionType: string) {
  const { locationId = '', activityDate = '', startedAt = '', excludeSessionId = '' } = context ?? {};
  const load = useCallback(async () => (await openStore()).getRecentSessions({ locationId, activityDate, startedAt, excludeSessionId }, sessionType),
    [locationId, activityDate, startedAt, excludeSessionId, sessionType]);
  return useFocusedReference(load, Boolean(context));
}

export function usePreviousExercise(context: ReferenceContext | null, exercise: ReferenceExercise) {
  const { locationId = '', activityDate = '', startedAt = '', excludeSessionId = '' } = context ?? {};
  const { catalogId, name, equipment, bodyweight, tracking, unit, convention } = exercise;
  const load = useCallback(async () => (await openStore()).getPreviousExercise({ locationId, activityDate, startedAt, excludeSessionId }, { catalogId, name, equipment, bodyweight, tracking, unit, convention }),
    [locationId, activityDate, startedAt, excludeSessionId, catalogId, name, equipment, bodyweight, tracking, unit, convention]);
  return useFocusedReference(load, Boolean(context && name.trim()));
}
