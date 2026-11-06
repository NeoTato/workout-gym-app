import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Text, View, useColorScheme } from 'react-native';
import { localDate } from '../domain/workout';
import { useWeeklyConsistency } from '../features/consistency/useWeeklyConsistency';
import { WeekProgress } from '../features/consistency/WeekProgress';

import { HomeScreen } from '../features/home/HomeScreen';
import { getTheme } from '../ui/theme';
import type { WorkoutListItem } from '../domain/workout';
import { openStore } from '../storage/openStore';
import { Button, Screen, styles } from '../ui/controls';

export default function HomeRoute() {
  const theme = getTheme(useColorScheme());
  const progress = useWeeklyConsistency(localDate(new Date()));
  const [workouts, setWorkouts] = useState<WorkoutListItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [hasDraft, setHasDraft] = useState(false), [loading, setLoading] = useState(true), [error, setError] = useState('');
  const cancel = useRef<(() => void) | null>(null);
  const refresh = useCallback(() => {
    cancel.current?.();
    let active = true; setLoading(true); setError('');
    cancel.current = () => { active = false; };
    openStore().then(async store => ({ history: await store.listWorkouts(), draft: await store.getDraft() })).then(({ history, draft }) => {
      if (active) { setWorkouts(history); setHasDraft(Boolean(draft)); setLoading(false); setLoaded(true); }
    }).catch(() => { if (active) { setError('Unable to open workout storage. Your data has not been reset.'); setLoading(false); } });
  }, []);
  useFocusEffect(useCallback(() => { refresh(); return () => cancel.current?.(); }, [refresh]));
  if (!loaded) return <Screen theme={theme}>
    <Text accessibilityRole={error ? 'alert' : undefined} style={{ color: theme.text }}>{error || 'Loading your workouts…'}</Text>
    {!!error && <Button theme={theme} label="Retry" onPress={refresh} />}
  </Screen>;
  return <HomeScreen theme={theme} workouts={workouts} hasDraft={hasDraft} onStart={() => router.push('/workout')}
    refreshing={loading} error={error} onRetry={refresh}
    onSummary={() => router.push('/summary')}
    onProgress={() => router.push('/progress')}
    onSettings={() => router.push('/settings')}
    weeklyProgress={<View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Text accessibilityRole="header" style={{ color: theme.text }}>This week</Text>
      {progress.data && <><WeekProgress week={progress.data.currentWeek} theme={theme} /><Text style={{ color: theme.muted }}>Current streak: {progress.data.currentStreak} {progress.data.currentStreak === 1 ? 'week' : 'weeks'}</Text></>}
      {!progress.data && !progress.error && <Text style={{ color: theme.muted }}>Loading progress...</Text>}
      {!!progress.error && <><Text accessibilityRole="alert" style={{ color: theme.danger }}>{progress.error}</Text><Button theme={theme} label="Retry progress" onPress={progress.retry} /></>}
      <Button theme={theme} variant="info" label="Goals and streaks" onPress={() => router.push('/consistency')} />
    </View>}
    onOpenDay={(date, filter) => router.push({ pathname: '/history/day', params: { date, filter } })}
    onOpen={id => router.push({ pathname: '/history/[id]', params: { id, returnToCalendar: '1' } })} />;
}
