import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import type { Location, SavedWorkout, WorkoutDraft } from '../../domain/workout';
import { SavedWorkoutEditor } from '../../features/workouts/SavedWorkoutEditor';
import { ExerciseGroups } from '../../features/exercises/ExerciseGroups';
import { CompletedExerciseSummary } from '../../features/workouts/CompletedExerciseSummary';
import { CompletedWorkoutMetadata } from '../../features/workouts/CompletedWorkoutMetadata';
import { RoutineDialog } from '../../features/workouts/RoutineDialog';
import { openStore } from '../../storage/openStore';
import { Button, Screen, styles } from '../../ui/controls';
import { fonts } from '../../ui/theme';
import { useAppTheme } from '../../ui/appearanceContext';

export default function WorkoutDetailsRoute() {
  const { id, returnToWorkout, returnToDay, returnToCalendar, returnToProgress } = useLocalSearchParams<{ id: string; returnToWorkout?: string; returnToDay?: string; returnToCalendar?: string; returnToProgress?: string }>();
  const theme = useAppTheme();
  const [workout, setWorkout] = useState<SavedWorkout | null>(null), [error, setError] = useState('');
  const [edit, setEdit] = useState<WorkoutDraft | null>(null), [locations, setLocations] = useState<Location[]>([]);
  const [busy, setBusy] = useState(false), [confirmDelete, setConfirmDelete] = useState(false);
  const action = useRef(false);
  const [routineOpen, setRoutineOpen] = useState(false), [routineNotice, setRoutineNotice] = useState('');
  function leaveDetails() {
    if ((returnToWorkout === '1' || returnToDay === '1' || returnToCalendar === '1' || returnToProgress === '1') && router.canGoBack()) router.back();
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
  useFocusEffect(useCallback(() => {
    let active = true;
    setError('');
    openStore().then(store => store.getWorkout(id)).then(value => { if (active) setWorkout(value); })
      .catch(() => { if (active) { setWorkout(null); setError('Unable to load this workout. It may have been removed. Return Home and try again.'); } });
    return () => { active = false; };
  }, [id]));
  if (edit) return <SavedWorkoutEditor initial={edit} locations={locations} theme={theme}
    cancel={() => setEdit(null)} save={async draft => {
      const store = await openStore(); await store.updateWorkout(draft);
      setEdit(null); setWorkout(null);
      try { setWorkout(await store.getWorkout(id)); }
      catch { setError('Changes saved. Return Home to reopen this workout.'); }
    }} />;
  return <Screen theme={theme}>
    <Button theme={theme} variant="link" label={returnToProgress === '1' ? 'Back to exercise progress' : returnToWorkout === '1' ? 'Back to workout' : returnToDay === '1' ? 'Back to day' : returnToCalendar === '1' ? 'Back to calendar' : '← Home'} onPress={leaveDetails} />
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <Text accessibilityRole="header" style={[styles.heading, { color: theme.text, flex: 1 }]}>{workout?.sessionType ?? 'Workout details'}</Text>
      {workout && !confirmDelete && <Button theme={theme} variant="link" label="Edit workout" disabled={busy} onPress={beginEdit} />}
    </View>
    {!!error && <Text accessibilityRole="alert" style={{ color: theme.danger }}>{error}</Text>}
    {!workout && !error && <Text style={{ color: theme.muted }}>Loading workout…</Text>}
    {workout && <>
      <CompletedWorkoutMetadata workout={workout} theme={theme} />
      {workout.recordOnly && <Text style={{ color: theme.muted }}>Workout-only entry. Attendance recorded; no exercise sets were logged.</Text>}
      {workout.exercises.length > 0 && <Button theme={theme} variant="info" label="Save as routine" disabled={busy || confirmDelete} onPress={() => setRoutineOpen(true)} />}
      {!!routineNotice && <Text accessibilityLiveRegion="polite" style={{ color: theme.success }}>{routineNotice}</Text>}
      {routineOpen && <RoutineDialog mode="save" theme={theme} workoutId={workout.id} close={() => setRoutineOpen(false)} saved={name => { setRoutineOpen(false); setRoutineNotice(`Routine saved: ${name}`); }} />}
      <ExerciseGroups key={workout.id} items={workout.exercises} theme={theme} renderItem={exercise => <CompletedExerciseSummary exercise={exercise} theme={theme} onProgress={exercise.catalogId ? () => router.push({ pathname: '/progress/[id]', params: { id: exercise.catalogId, variationId: exercise.equipmentVariationId } }) : undefined} />} />
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
