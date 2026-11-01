import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Text, useColorScheme } from 'react-native';

import { HomeScreen } from '../features/home/HomeScreen';
import { getTheme } from '../ui/theme';
import type { SavedWorkout } from '../domain/workout';
import { openStore } from '../storage/openStore';
import { Button, Screen } from '../ui/controls';

export default function HomeRoute() {
  const theme = getTheme(useColorScheme());
  const [workouts, setWorkouts] = useState<Omit<SavedWorkout, 'exercises'>[]>([]);
  const [hasDraft, setHasDraft] = useState(false), [loading, setLoading] = useState(true), [error, setError] = useState('');
  const cancel = useRef<(() => void) | null>(null);
  const refresh = useCallback(() => {
    cancel.current?.();
    let active = true; setLoading(true); setError('');
    cancel.current = () => { active = false; };
    openStore().then(async store => ({ history: await store.listWorkouts(), draft: await store.getDraft() })).then(({ history, draft }) => {
      if (active) { setWorkouts(history); setHasDraft(Boolean(draft)); setLoading(false); }
    }).catch(() => { if (active) { setError('Unable to open workout storage. Your data has not been reset.'); setLoading(false); } });
  }, []);
  useFocusEffect(useCallback(() => { refresh(); return () => cancel.current?.(); }, [refresh]));
  if (loading || error) return <Screen theme={theme}>
    <Text accessibilityRole={error ? 'alert' : undefined} style={{ color: theme.text }}>{error || 'Loading your workouts…'}</Text>
    {!!error && <Button theme={theme} label="Retry" onPress={refresh} />}
  </Screen>;
  return <HomeScreen theme={theme} workouts={workouts} hasDraft={hasDraft} onStart={() => router.push('/workout')}
    onOpen={id => router.push({ pathname: '/history/[id]', params: { id } })} />;
}
