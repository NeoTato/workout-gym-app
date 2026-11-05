import { randomUUID } from 'expo-crypto';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Text, View, useColorScheme } from 'react-native';
import type { WorkoutDraft } from '../domain/workout';
import { workoutTimes } from '../domain/workoutTime';
import { ExercisePicker } from '../features/workouts/ExercisePicker';
import { useExerciseLibrary } from '../features/workouts/useExerciseLibrary';
import { ExerciseEditor } from '../features/workouts/ExerciseEditor';
import { useExerciseScroll } from '../features/workouts/useExerciseScroll';
import { WorkoutSessionDetails, WorkoutSessionSummary } from '../features/workouts/WorkoutSessionDetails';
import { newExercise, useWorkoutDraft } from '../features/workouts/useWorkoutDraft';
import { Button, Screen, styles } from '../ui/controls';
import { getTheme } from '../ui/theme';

export default function WorkoutRoute() {
  const model = useWorkoutDraft();
  const theme = getTheme(useColorScheme());
  if (model.draft) return <WorkoutFlow {...model} draft={model.draft} />;
  return <Screen theme={theme}>
    <Button theme={theme} variant="link" label="‹ Home" accessibilityLabel="Home - keep draft" onPress={() => router.replace('/')} />
    <Text accessibilityRole={model.error ? 'alert' : undefined} style={{ color: theme.text }}>{model.error || model.status}</Text>
  </Screen>;
}

function WorkoutFlow({ draft, locations, status, error, busy, update, addGym, removeLocation, finish, discard }: ReturnType<typeof useWorkoutDraft> & { draft: WorkoutDraft }) {
  const theme = getTheme(useColorScheme());
  const [step, setStep] = useState<'details' | 'exercises'>(() => (draft.setupComplete ?? Boolean(draft.locationId)) ? 'exercises' : 'details');
  const library = useExerciseLibrary();
  const { scrollRef, requestScroll, onExerciseLayout } = useExerciseScroll();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [addedId, setAddedId] = useState<string>();
  const [setupError, setSetupError] = useState(''), [addingGym, setAddingGym] = useState(false);
  const footer = <>
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
      <Text accessibilityLiveRegion="polite" style={{ color: status === 'Not saved' ? theme.danger : status === 'Draft saved' ? theme.success : theme.muted, flex: 1, fontSize: 12 }}>{status === 'Not saved' ? 'Couldn’t save' : status}</Text>
      <Button theme={theme} variant="danger" label="Discard workout" disabled={busy || addingGym} onPress={() => Alert.alert('Discard this workout?', 'This removes the unfinished draft from this phone.', [
        { text: 'Keep workout', style: 'cancel' }, { text: 'Discard', style: 'destructive', onPress: async () => { if (await discard()) router.replace('/'); } },
      ])} />
    </View>
    {step === 'details' ? <>
        <Button theme={theme} primary label="Continue to exercises" disabled={busy || addingGym} onPress={() => {
          if (!draft.locationId) { setSetupError('Choose your gym or Home before continuing.'); return; }
          try { workoutTimes(draft, new Date().toISOString()); }
          catch (failure) { setSetupError(failure instanceof Error ? failure.message : 'Check your workout date and time.'); return; }
          update(value => ({ ...value, setupComplete: true })); setSetupError(''); setStep('exercises');
        }} />
    </> : <>
      <Button theme={theme} primary label={busy ? 'Please wait…' : 'Finish workout'} disabled={busy} onPress={async () => {
        const id = await finish(); if (id) router.replace({ pathname: '/history/[id]', params: { id } });
      }} />
    </>}
  </>;
  return <Screen theme={theme} key={step} footer={footer} scrollRef={scrollRef}>
    <Button theme={theme} variant="link" label="‹ Home" accessibilityLabel="Home - keep draft" disabled={busy || addingGym} onPress={() => router.replace('/')} />
    <Text accessibilityRole="header" style={[styles.heading, { color: theme.text }]}>{step === 'details' ? 'Set up workout' : 'Your workout'}</Text>
    {!!error && <Text accessibilityRole="alert" style={{ color: theme.danger }}>{error}</Text>}
    {!!setupError && <Text accessibilityRole="alert" style={{ color: theme.danger }}>{setupError}</Text>}
    {status === 'Not saved' && <Button theme={theme} label="Retry save" onPress={() => update(value => ({ ...value }))} />}
    {pickerOpen && <ExercisePicker theme={theme} {...library} cancel={() => setPickerOpen(false)} add={(name, option, category, subcategory) => {
      const exercise = { ...newExercise(), name, catalogId: option?.id, bodyweight: option?.bodyweight ?? false, category, subcategory };
      requestScroll(exercise.id);
      update(value => ({ ...value, exercises: [...value.exercises, exercise] })); setAddedId(exercise.id); setPickerOpen(false);
    }} />}
    {draft && step && <>
      {step === 'details' ? <>
        <WorkoutSessionDetails draft={draft} locations={locations} theme={theme} busy={busy || addingGym}
          update={change => { setSetupError(''); update(change); }}
          removeLocation={async id => { setAddingGym(true); try { await removeLocation(id); } finally { setAddingGym(false); } }}
          addGym={async name => { setAddingGym(true); try { await addGym(name); } finally { setAddingGym(false); } }} />

      </> : <>
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          <View style={{ flex: 1 }}><WorkoutSessionSummary draft={draft} locations={locations} theme={theme} /></View>
          <Button theme={theme} variant="link" label="Edit details" disabled={busy} onPress={() => { setSetupError(''); setStep('details'); }} />
        </View>
      {draft.exercises.map((exercise, index) => <View key={exercise.id} testID={`exercise-card-${exercise.id}`} onLayout={event => onExerciseLayout(exercise.id, event)}><ExerciseEditor library={library.items} initiallyExpanded={index === 0 || exercise.id === addedId} exercise={exercise} index={index} theme={theme} disabled={busy} newId={randomUUID}
        update={next => update(value => ({ ...value, exercises: value.exercises.map(item => item.id === next.id ? next : item) }))}
        remove={() => update(value => ({ ...value, exercises: value.exercises.filter(item => item.id !== exercise.id) }))} /></View>)}
      {!draft.exercises.length && <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={{ color: theme.text }}>Add your first exercise</Text><Text style={[styles.subtitle, { color: theme.muted }]}>Choose a familiar exercise or start with a new one.</Text>
      </View>}
      <Button theme={theme} variant="add" label="+ Add exercise" disabled={busy} onPress={() => setPickerOpen(true)} />
      <Text style={[styles.subtitle, { color: theme.muted }]}>Only sets marked done will be saved as performed. There is no required exercise or set count.</Text>

      </>}

    </>}
  </Screen>;
}
