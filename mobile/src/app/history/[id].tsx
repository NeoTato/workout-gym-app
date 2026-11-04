import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Text, View, useColorScheme } from 'react-native';
import type { Location, SavedWorkout, WorkoutDraft } from '../../domain/workout';
import { timeFields } from '../../domain/workoutTime';
import { SavedWorkoutEditor } from '../../features/workouts/SavedWorkoutEditor';
import { openStore } from '../../storage/openStore';
import { Button, Screen, styles } from '../../ui/controls';
import { fonts, getTheme } from '../../ui/theme';

export default function WorkoutDetailsRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = getTheme(useColorScheme());
  const [workout, setWorkout] = useState<SavedWorkout | null>(null), [error, setError] = useState('');
  const [edit, setEdit] = useState<WorkoutDraft | null>(null), [locations, setLocations] = useState<Location[]>([]);
  const [busy, setBusy] = useState(false), [confirmDelete, setConfirmDelete] = useState(false);
  const action = useRef(false);
  async function beginEdit() {
    if (action.current) return;
    action.current = true; setBusy(true); setError('');
    try {
      const store = await openStore();
      const draft = await store.getWorkoutEdit(id);
      setLocations(await store.listLocations()); setEdit(draft);
    } catch { setError('Unable to open editing. Try again.'); }
    finally { action.current = false; setBusy(false); }
  }
  useEffect(() => {
    let active = true;
    openStore().then(store => store.getWorkout(id)).then(value => { if (active) setWorkout(value); })
      .catch(() => { if (active) setError('Unable to load this workout. Return Home and try again.'); });
    return () => { active = false; };
  }, [id]);
  if (edit) return <SavedWorkoutEditor initial={edit} locations={locations} theme={theme}
    cancel={() => setEdit(null)} save={async draft => {
      const store = await openStore(); await store.updateWorkout(draft);
      setEdit(null); setWorkout(null);
      try { setWorkout(await store.getWorkout(id)); }
      catch { setError('Changes saved. Return Home to reopen this workout.'); }
    }} />;
  return <Screen theme={theme}>
    <Button theme={theme} variant="link" label="← Home" onPress={() => router.replace('/')} />
    <Text accessibilityRole="header" style={[styles.heading, { color: theme.text }]}>{workout?.sessionType ?? 'Workout details'}</Text>
    {!!error && <Text accessibilityRole="alert" style={{ color: theme.danger }}>{error}</Text>}
    {!workout && !error && <Text style={{ color: theme.muted }}>Loading workout…</Text>}
    {workout && <>
      {!confirmDelete && <Button theme={theme} label="Edit workout" disabled={busy} onPress={beginEdit} />}
      <Text style={[styles.subtitle, { color: theme.muted }]}>{workout.activityDate} · {workout.locationName}</Text>
      <Text style={[styles.subtitle, { color: theme.muted }]}>
        {timeFields(workout.startedAt, workout.timezone).date} {timeFields(workout.startedAt, workout.timezone).time}
        {' → '}{timeFields(workout.endedAt, workout.timezone).date} {timeFields(workout.endedAt, workout.timezone).time} ({workout.timezone})
      </Text>
      <Text style={{ color: theme.success, fontFamily: fonts.bold }}>✓ Saved on this phone</Text>
      {workout.exercises.map(exercise => <View key={exercise.id} style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text accessibilityRole="header" style={{ color: theme.text, fontFamily: fonts.bold, fontSize: 18 }}>{exercise.name}</Text>
        <Text style={{ color: theme.muted }}>{exercise.equipment}</Text>
        {!exercise.bodyweight && <Text style={{ color: theme.muted }}>{exercise.unit === 'lb' ? 'lbs' : exercise.unit} · {exercise.convention.replace('_', ' ')}</Text>}
        {exercise.sets.map((set, index) => <Text key={set.id} style={[styles.subtitle, { color: theme.text }]}>
          Set {index + 1}: {exercise.bodyweight ? 'Bodyweight' : `${set.weight} ${exercise.unit === 'lb' ? 'lbs' : exercise.unit}`} × {set.reps} reps
        </Text>)}
      </View>)}
      {confirmDelete ? <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text accessibilityRole="header" style={{ color: theme.text, fontFamily: fonts.bold }}>Delete this workout?</Text>
        <Text style={[styles.subtitle, { color: theme.muted }]}>This permanently removes this workout and all its sets from this phone. This cannot be undone.</Text>
        <Button theme={theme} label="Keep workout" disabled={busy} onPress={() => setConfirmDelete(false)} />
        <Button theme={theme} variant="destructive" label={busy ? 'Deleting…' : 'Permanently delete workout'} disabled={busy} onPress={async () => {
          if (action.current) return;
          action.current = true; setBusy(true); setError('');
          try { await (await openStore()).deleteWorkout(id); router.replace('/'); }
          catch { setError('Unable to delete this workout. Try again.'); }
          finally { action.current = false; setBusy(false); }
        }} />
      </View> : <Button theme={theme} variant="danger" label="Delete workout" disabled={busy} onPress={() => setConfirmDelete(true)} />}
    </>}
  </Screen>;
}
