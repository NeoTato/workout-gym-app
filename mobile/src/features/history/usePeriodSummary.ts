import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import type { PeriodSummary, SummaryPeriod } from '../../domain/workoutSummary';
import { openStore } from '../../storage/openStore';

export function usePeriodSummary(kind: SummaryPeriod, anchor: string, today: string) {
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<{ kind: SummaryPeriod; anchor: string; today: string; revision: number; data: PeriodSummary | null; error: string }>({ kind, anchor, today, revision, data: null, error: '' });
  useFocusEffect(useCallback(() => {
    let active = true;
    const identity = { kind, anchor, today, revision };
    setState({ ...identity, data: null, error: '' });
    openStore().then(store => store.getPeriodSummary(kind, anchor, today)).then(data => { if (active) setState({ ...identity, data, error: '' }); })
      .catch(() => { if (active) setState({ ...identity, data: null, error: 'Unable to load this summary. Your workouts have not been changed. Try again.' }); });
    return () => { active = false; };
  }, [kind, anchor, today, revision]));
  const current = state.kind === kind && state.anchor === anchor && state.today === today && state.revision === revision ? state : { data: null, error: '' };
  return { data: current.data, error: current.error, retry: () => setRevision(value => value + 1) };
}
