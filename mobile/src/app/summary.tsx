import { router } from 'expo-router';
import { useState } from 'react';
import { localDate } from '../domain/workout';
import type { SummaryPeriod } from '../domain/workoutSummary';
import { WorkoutSummaryScreen } from '../features/history/WorkoutSummaryScreen';
import { usePeriodSummary } from '../features/history/usePeriodSummary';
import { useAppTheme } from '../ui/appearanceContext';

export default function WorkoutSummaryRoute() {
  const today = localDate(new Date());
  const [kind, setKind] = useState<SummaryPeriod>('month'), [anchor, setAnchor] = useState(today);
  const query = usePeriodSummary(kind, anchor, today);
  return <WorkoutSummaryScreen kind={kind} anchor={anchor} today={today} {...query} theme={useAppTheme()}
    changeKind={setKind} changeAnchor={setAnchor} back={() => { if (router.canGoBack()) router.back(); else router.replace('/'); }} />;
}
