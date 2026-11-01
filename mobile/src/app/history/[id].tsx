import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, View, useColorScheme } from 'react-native';
import type { SavedWorkout } from '../../domain/workout';
import { openStore } from '../../storage/openStore';
import { Button, Screen, styles } from '../../ui/controls';
import { fonts, getTheme } from '../../ui/theme';

export default function WorkoutDetailsRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = getTheme(useColorScheme());
  const [workout, setWorkout] = useState<SavedWorkout | null>(null), [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    openStore().then(store => store.getWorkout(id)).then(value => { if (active) setWorkout(value); })
      .catch(() => { if (active) setError('Unable to load this workout. Return Home and try again.'); });
    return () => { active = false; };
  }, [id]);
  return <Screen theme={theme}>
    <Button theme={theme} label="← Home" onPress={() => router.replace('/')} />
    <Text accessibilityRole="header" style={[styles.heading, { color: theme.text }]}>{workout?.sessionType ?? 'Workout details'}</Text>
    {!!error && <Text accessibilityRole="alert" style={{ color: theme.accent }}>{error}</Text>}
    {!workout && !error && <Text style={{ color: theme.muted }}>Loading workout…</Text>}
    {workout && <>
      <Text style={[styles.subtitle, { color: theme.muted }]}>{workout.activityDate} · {workout.locationName}</Text>
      <Text style={{ color: theme.accent, fontFamily: fonts.bold }}>✓ Saved on this phone</Text>
      {workout.exercises.map(exercise => <View key={exercise.id} style={[styles.card, { backgroundColor: theme.surface }]}>
        <Text accessibilityRole="header" style={{ color: theme.text, fontFamily: fonts.bold, fontSize: 18 }}>{exercise.name}</Text>
        <Text style={{ color: theme.muted }}>{exercise.equipment}</Text>
        {!exercise.bodyweight && <Text style={{ color: theme.muted }}>{exercise.unit === 'lb' ? 'lbs' : exercise.unit} · {exercise.convention.replace('_', ' ')}</Text>}
        {exercise.sets.map((set, index) => <Text key={set.id} style={[styles.subtitle, { color: theme.text }]}>
          Set {index + 1}: {exercise.bodyweight ? 'Bodyweight' : `${set.weight} ${exercise.unit === 'lb' ? 'lbs' : exercise.unit}`} × {set.reps} reps
        </Text>)}
      </View>)}
    </>}
  </Screen>;
}
