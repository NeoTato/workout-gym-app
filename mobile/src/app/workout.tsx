import { randomUUID } from 'expo-crypto';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Text, useColorScheme } from 'react-native';
import type { WorkoutDraft } from '../domain/workout';
import { workoutTimes } from '../domain/workoutTime';
import { ExerciseEditor } from '../features/workouts/ExerciseEditor';
import { WorkoutSessionDetails, WorkoutSessionSummary } from '../features/workouts/WorkoutSessionDetails';
import { newExercise, useWorkoutDraft } from '../features/workouts/useWorkoutDraft';
import { Button, Screen, styles } from '../ui/controls';
import { getTheme } from '../ui/theme';

export default function WorkoutRoute() {
  const model = useWorkoutDraft();
  const theme = getTheme(useColorScheme());
  if (model.draft) return <WorkoutFlow {...model} draft={model.draft} />;
  return <Screen theme={theme}>
    <Button theme={theme} label="Home - keep draft" onPress={() => router.replace('/')} />
    <Text accessibilityRole={model.error ? 'alert' : undefined} style={{ color: theme.text }}>{model.error || model.status}</Text>
  </Screen>;
}

function WorkoutFlow({ draft, locations, status, error, busy, update, addGym, finish, discard }: ReturnType<typeof useWorkoutDraft> & { draft: WorkoutDraft }) {
  const theme = getTheme(useColorScheme());
  const [step, setStep] = useState<'details' | 'exercises'>(() => (draft.setupComplete ?? Boolean(draft.locationId)) ? 'exercises' : 'details');
  const [setupError, setSetupError] = useState(''), [addingGym, setAddingGym] = useState(false);
  return <Screen theme={theme} key={step}>
    <Button theme={theme} label="Home - keep draft" disabled={busy || addingGym} onPress={() => router.replace('/')} />
    <Text accessibilityRole="header" style={[styles.heading, { color: theme.text }]}>{step === 'details' ? 'Set up workout' : 'Your workout'}</Text>
    <Text accessibilityLiveRegion="polite" style={[styles.subtitle, { color: theme.muted }]}>{status}</Text>
    {!!error && <Text accessibilityRole="alert" style={{ color: theme.accent }}>{error}</Text>}
    {!!setupError && <Text accessibilityRole="alert" style={{ color: theme.accent }}>{setupError}</Text>}
    {status === 'Not saved' && <Button theme={theme} label="Retry save" onPress={() => update(value => ({ ...value }))} />}
    {draft && step && <>
      {step === 'details' ? <>
        <WorkoutSessionDetails draft={draft} locations={locations} theme={theme} busy={busy || addingGym}
          update={change => { setSetupError(''); update(change); }}
          addGym={async name => { setAddingGym(true); try { await addGym(name); } finally { setAddingGym(false); } }} />
        <Button theme={theme} primary label="Continue to exercises" disabled={busy || addingGym} onPress={() => {
          if (!draft.locationId) { setSetupError('Choose your gym or Home before continuing.'); return; }
          try { workoutTimes(draft, new Date().toISOString()); }
          catch (failure) { setSetupError(failure instanceof Error ? failure.message : 'Check your workout date and time.'); return; }
          update(value => ({ ...value, setupComplete: true })); setSetupError(''); setStep('exercises');
        }} />
      </> : <>
        <WorkoutSessionSummary draft={draft} locations={locations} theme={theme} />
        <Button theme={theme} label="Edit details" disabled={busy} onPress={() => { setSetupError(''); setStep('details'); }} />
      {draft.exercises.map((exercise, index) => <ExerciseEditor key={exercise.id} exercise={exercise} index={index} theme={theme} disabled={busy} newId={randomUUID}
        update={next => update(value => ({ ...value, exercises: value.exercises.map(item => item.id === next.id ? next : item) }))}
        remove={() => update(value => ({ ...value, exercises: value.exercises.filter(item => item.id !== exercise.id) }))} />)}
      <Button theme={theme} label="+ Add exercise" disabled={busy} onPress={() => update(value => ({ ...value, exercises: [...value.exercises, newExercise()] }))} />
      <Text style={[styles.subtitle, { color: theme.muted }]}>Only sets marked done will be saved as performed. There is no required exercise or set count.</Text>
      <Button theme={theme} primary label={busy ? 'Please wait…' : 'Finish workout'} disabled={busy} onPress={async () => {
        const id = await finish(); if (id) router.replace({ pathname: '/history/[id]', params: { id } });
      }} />
      </>}
      <Button theme={theme} label="Discard workout" disabled={busy || addingGym} onPress={() => Alert.alert('Discard this workout?', 'This removes the unfinished draft from this phone.', [
        { text: 'Keep workout', style: 'cancel' }, { text: 'Discard', style: 'destructive', onPress: async () => { if (await discard()) router.replace('/'); } },
      ])} />
    </>}
  </Screen>;
}
