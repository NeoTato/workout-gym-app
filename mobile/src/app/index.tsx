import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { localDate } from '../domain/workout';
import { useWeeklyConsistency } from '../features/consistency/useWeeklyConsistency';
import { WeeklyPreview } from '../features/home/WeeklyPreview';

import { HomeScreen } from '../features/home/HomeScreen';
import { useAppTheme } from '../ui/appearanceContext';
import type { SavedWorkout, WorkoutListItem } from '../domain/workout';
import { openStore } from '../storage/openStore';
import { Button, Screen, styles } from '../ui/controls';

export default function HomeRoute() {
  const theme = useAppTheme();
  const progress = useWeeklyConsistency(localDate(new Date()));
  const [workouts, setWorkouts] = useState<WorkoutListItem[]>([]);
  const [latestWorkout, setLatestWorkout] = useState<SavedWorkout | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [hasDraft, setHasDraft] = useState(false), [loading, setLoading] = useState(true), [error, setError] = useState('');
  const cancel = useRef<(() => void) | null>(null);
  const refresh = useCallback(() => {
    cancel.current?.();
    let active = true; setLoading(true); setError('');
    cancel.current = () => { active = false; };
    openStore().then(async store => {
      const history = await store.listWorkouts(), draft = await store.getDraft();
      const latest = history[0] ? await store.getWorkout(history[0].id).catch(() => null) : null;
      return { history, draft, latest };
    }).then(({ history, draft, latest }) => {
      if (active) { setWorkouts(history); setLatestWorkout(latest); setHasDraft(Boolean(draft)); setLoading(false); setLoaded(true); }
    }).catch(() => { if (active) { setError('Unable to open workout storage. Your data has not been reset.'); setLoading(false); } });
  }, []);
  useFocusEffect(useCallback(() => { refresh(); return () => cancel.current?.(); }, [refresh]));
  if (!loaded) return <Screen theme={theme}>
    <Text accessibilityRole={error ? 'alert' : undefined} style={{ color: theme.text }}>{error || 'Loading your workouts…'}</Text>
    {!!error && <Button theme={theme} label="Retry" onPress={refresh} />}
  </Screen>;
  return <HomeScreen theme={theme} workouts={workouts} latestWorkout={latestWorkout} hasDraft={hasDraft} onStart={() => router.push('/workout')}
    refreshing={loading} error={error} onRetry={refresh}
    onHistory={() => router.replace('/history')}
    weeklyProgress={progress.data ? <WeeklyPreview week={progress.data.currentWeek} streak={progress.data.currentStreak} dates={workouts.map(workout => workout.activityDate)} theme={theme} open={() => router.push('/consistency')} /> : <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Text accessibilityRole="header" style={{ color: theme.text }}>This week</Text>
      {!progress.data && !progress.error && <Text style={{ color: theme.muted }}>Loading progress...</Text>}
      {!!progress.error && <><Text accessibilityRole="alert" style={{ color: theme.danger }}>{progress.error}</Text><Button theme={theme} label="Retry progress" onPress={progress.retry} /></>}
      <Button theme={theme} variant="info" label="Goals and streaks" onPress={() => router.push('/consistency')} />
    </View>}
    onOpen={id => router.push({ pathname: '/history/[id]', params: { id, returnToHome: '1' } })} />;
}
