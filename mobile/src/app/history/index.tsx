import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Text } from 'react-native';
import type { WorkoutListItem } from '../../domain/workout';
import { WorkoutCalendar } from '../../features/home/WorkoutCalendar';
import { openStore } from '../../storage/openStore';
import { useAppTheme } from '../../ui/appearanceContext';
import { Button, Screen, styles } from '../../ui/controls';

export default function HistoryRoute() {
  const theme = useAppTheme();
  const [workouts, setWorkouts] = useState<WorkoutListItem[]>([]), [loading, setLoading] = useState(true), [error, setError] = useState('');
  const cancel = useRef<(() => void) | null>(null);
  const refresh = useCallback(() => {
    cancel.current?.();
    let active = true; setLoading(true); setError('');
    cancel.current = () => { active = false; };
    openStore().then(store => store.listWorkouts()).then(value => { if (active) { setWorkouts(value); setLoading(false); } })
      .catch(() => { if (active) { setError('Unable to load history. Your data has not been reset.'); setLoading(false); } });
  }, []);
  useFocusEffect(useCallback(() => { refresh(); return () => cancel.current?.(); }, [refresh]));
  return <Screen theme={theme}>
    <Text accessibilityRole="header" style={[styles.heading, { color: theme.text }]}>History</Text>
    <Text style={[styles.subtitle, { color: theme.muted }]}>Browse your calendar and completed workouts.</Text>
    {loading && <Text style={{ color: theme.muted }}>Loading history...</Text>}
    {!!error && <><Text accessibilityRole="alert" style={{ color: theme.danger }}>{error}</Text><Button theme={theme} label="Retry history" onPress={refresh} /></>}
    {!loading && !error && !workouts.length && <Text style={{ color: theme.muted }}>No completed workouts yet.</Text>}
    <WorkoutCalendar workouts={workouts} theme={theme} disabled={loading || Boolean(error)} openDay={(date, filter) => router.push({ pathname: '/history/day', params: { date, filter } })}
      openWorkout={id => router.push({ pathname: '/history/[id]', params: { id, returnToCalendar: '1' } })} />
  </Screen>;
}
