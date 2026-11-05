import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Text, View, useColorScheme } from 'react-native';
import type { Location, SavedWorkout, WorkoutDraft } from '../../domain/workout';
import { SavedWorkoutEditor } from '../../features/workouts/SavedWorkoutEditor';
import { CompletedExerciseSummary } from '../../features/workouts/CompletedExerciseSummary';
import { CompletedWorkoutMetadata } from '../../features/workouts/CompletedWorkoutMetadata';
import { RoutineDialog } from '../../features/workouts/RoutineDialog';
import { openStore } from '../../storage/openStore';
import { Button, Screen, styles } from '../../ui/controls';
import { fonts, getTheme } from '../../ui/theme';

export default function WorkoutDetailsRoute() {
  const { id, returnToWorkout } = useLocalSearchParams<{ id: string; returnToWorkout?: string }>();
  const theme = getTheme(useColorScheme());
  const [workout, setWorkout] = useState<SavedWorkout | null>(null), [error, setError] = useState('');
  const [edit, setEdit] = useState<WorkoutDraft | null>(null), [locations, setLocations] = useState<Location[]>([]);
  const [busy, setBusy] = useState(false), [confirmDelete, setConfirmDelete] = useState(false);
  const action = useRef(false);
  const [routineOpen, setRoutineOpen] = useState(false), [routineNotice, setRoutineNotice] = useState('');
  function leaveDetails() {
    if (returnToWorkout === '1' && router.canGoBack()) router.back();
    else router.replace('/');
  }
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
    <Button theme={theme} variant="link" label={returnToWorkout === '1' ? 'Back to workout' : '← Home'} onPress={leaveDetails} />
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <Text accessibilityRole="header" style={[styles.heading, { color: theme.text, flex: 1 }]}>{workout?.sessionType ?? 'Workout details'}</Text>
      {workout && !confirmDelete && <Button theme={theme} variant="link" label="Edit workout" disabled={busy} onPress={beginEdit} />}
    </View>
    {!!error && <Text accessibilityRole="alert" style={{ color: theme.danger }}>{error}</Text>}
    {!workout && !error && <Text style={{ color: theme.muted }}>Loading workout…</Text>}
    {workout && <>
      <CompletedWorkoutMetadata workout={workout} theme={theme} />
      <Button theme={theme} variant="link" label="Save as routine" disabled={busy || confirmDelete} onPress={() => setRoutineOpen(true)} />
      {!!routineNotice && <Text accessibilityLiveRegion="polite" style={{ color: theme.success }}>{routineNotice}</Text>}
      {routineOpen && <RoutineDialog mode="save" theme={theme} workoutId={workout.id} close={() => setRoutineOpen(false)} saved={name => { setRoutineOpen(false); setRoutineNotice(`Routine saved: ${name}`); }} />}
      {workout.exercises.map(exercise => <CompletedExerciseSummary key={exercise.id} exercise={exercise} theme={theme} />)}
      {confirmDelete ? <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text accessibilityRole="header" style={{ color: theme.text, fontFamily: fonts.bold }}>Delete this workout?</Text>
        <Text style={[styles.subtitle, { color: theme.muted }]}>This permanently removes this workout and all its sets from this phone. This cannot be undone.</Text>
        <Button theme={theme} label="Keep workout" disabled={busy} onPress={() => setConfirmDelete(false)} />
        <Button theme={theme} variant="destructive" label={busy ? 'Deleting…' : 'Permanently delete workout'} disabled={busy} onPress={async () => {
          if (action.current) return;
          action.current = true; setBusy(true); setError('');
          try { await (await openStore()).deleteWorkout(id); leaveDetails(); }
          catch { setError('Unable to delete this workout. Try again.'); }
          finally { action.current = false; setBusy(false); }
        }} />
      </View> : <Button theme={theme} variant="danger" label="Delete workout" disabled={busy} onPress={() => setConfirmDelete(true)} />}
    </>}
  </Screen>;
}
