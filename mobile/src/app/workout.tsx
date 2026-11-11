import { randomUUID } from 'expo-crypto';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Modal, Text, View } from 'react-native';
import { cardioDefault, type WorkoutDraft } from '../domain/workout';
import { addRoutineToDraft } from '../domain/routine';
import { validReferenceContext } from '../domain/workoutReferences';
import { RecentSessions } from '../features/workouts/WorkoutReferences';
import { workoutTimes } from '../domain/workoutTime';
import { ExercisePicker } from '../features/workouts/ExercisePicker';
import { useExerciseLibrary } from '../features/workouts/useExerciseLibrary';
import { ExerciseEditor } from '../features/workouts/ExerciseEditor';
import { useExerciseScroll } from '../features/workouts/useExerciseScroll';
import { RoutineDialog } from '../features/workouts/RoutineDialog';
import { WorkoutLoggingHelp } from '../features/workouts/WorkoutLoggingHelp';
import { WorkoutSessionDetails, WorkoutSessionSummary } from '../features/workouts/WorkoutSessionDetails';
import { newExercise, useWorkoutDraft } from '../features/workouts/useWorkoutDraft';
import { Button, Screen, styles } from '../ui/controls';
import { useAppTheme } from '../ui/appearanceContext';
import { useRestTimer } from '../features/rest/restContext';
import { NotesImportDialog } from '../features/workouts/NotesImportDialog';

export default function WorkoutRoute() {
  const model = useWorkoutDraft();
  const theme = useAppTheme();
  if (model.draft) return <WorkoutFlow {...model} draft={model.draft} />;
  return <Screen theme={theme}>
    <Button theme={theme} variant="link" label="‹ Home" accessibilityLabel="Home - keep draft" onPress={() => router.replace('/')} />
    <Text accessibilityRole={model.error ? 'alert' : undefined} style={{ color: theme.text }}>{model.error || model.status}</Text>
  </Screen>;
}

function WorkoutFlow({ draft, locations, status, error, busy, update, addGym, removeLocation, finish, discard }: ReturnType<typeof useWorkoutDraft> & { draft: WorkoutDraft }) {
  const theme = useAppTheme();
  const rest = useRestTimer();
  const [step, setStep] = useState<'details' | 'exercises'>(() => (draft.setupComplete ?? Boolean(draft.locationId)) ? 'exercises' : 'details');
  const library = useExerciseLibrary();
  const { scrollRef, requestScroll, onExerciseLayout } = useExerciseScroll();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [addedId, setAddedId] = useState<string>();
  const [routineOpen, setRoutineOpen] = useState(false), [routineNotice, setRoutineNotice] = useState('');
  const [setupError, setSetupError] = useState(''), [addingGym, setAddingGym] = useState(false);
  const [quickConfirm, setQuickConfirm] = useState(false);
  const references = validReferenceContext(draft);
  const completedSetCount = draft.exercises.reduce((total, exercise) => total + exercise.sets.filter(set => set.completed).length, 0);
  function recordWorkoutOnly() {
    if (!draft.locationId) { setSetupError('Choose your gym or Home before recording a workout.'); return; }
    try { workoutTimes(draft, new Date().toISOString()); }
    catch (failure) { setSetupError(failure instanceof Error ? failure.message : 'Check your workout date and time.'); return; }
    setQuickConfirm(true);
  }
  const footer = <>
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
      <View style={{ flex: 1, gap: 4 }}>
        {step === 'exercises' && <Text style={{ color: theme.text, fontSize: 12 }}>{completedSetCount} {completedSetCount === 1 ? 'set done' : 'sets done'}</Text>}
        {!!status && <Text accessibilityLiveRegion="polite" style={{ color: status === 'Not saved' ? theme.danger : status === 'Draft saved' ? theme.success : theme.muted, fontSize: 12 }}>{status === 'Not saved' ? 'Couldn’t save' : status}</Text>}
      </View>
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
    {notesOpen && <NotesImportDialog library={library.items} busy={busy} close={() => setNotesOpen(false)} importExercises={exercises => {
      update(value => ({ ...value, exercises: [...value.exercises, ...exercises] }));
      setNotesOpen(false); setAddedId(exercises[0]?.id); if (exercises[0]) requestScroll(exercises[0].id);
      setRoutineNotice(`Added ${exercises.length} exercises from notes. Review equipment and categories before finishing.`);
    }} />}
    <Modal visible={quickConfirm} transparent animationType="fade" onRequestClose={() => { if (!busy) setQuickConfirm(false); }}>
      <View style={{ flex: 1, backgroundColor: '#00000066', justifyContent: 'center', padding: 24 }}>
        <View accessibilityViewIsModal style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border, width: '100%', maxWidth: 440, alignSelf: 'center' }]}>
          <Text accessibilityRole="header" style={{ color: theme.text, fontSize: 20 }}>Record workout without sets?</Text>
          <WorkoutSessionSummary draft={draft} locations={locations} theme={theme} />
          <Text style={{ color: theme.muted }}>This counts toward attendance and streaks. No exercises, sets or muscle coverage will be added.</Text>
          {!!error && <Text accessibilityRole="alert" style={{ color: theme.danger }}>{error}</Text>}
          <Button theme={theme} primary label={busy ? 'Recording...' : 'Record workout'} disabled={busy} onPress={async () => {
            const id = await finish(true); if (id) router.replace({ pathname: '/history/[id]', params: { id } });
          }} />
          <Button theme={theme} label="Cancel" disabled={busy} onPress={() => setQuickConfirm(false)} />
        </View>
      </View>
    </Modal>
    <Button theme={theme} variant="link" label="‹ Home" accessibilityLabel="Home - keep draft" disabled={busy || addingGym} onPress={() => router.replace('/')} />
    <Text accessibilityRole="header" style={[styles.heading, { color: theme.text }]}>{step === 'details' ? 'Set up workout' : 'Your workout'}</Text>
    {step === 'exercises' && <Text style={{ color: theme.muted }}>Log each set as you go. Finish workout when your session ends.</Text>}
    {!!error && <Text accessibilityRole="alert" style={{ color: theme.danger }}>{error}</Text>}
    {!!setupError && <Text accessibilityRole="alert" style={{ color: theme.danger }}>{setupError}</Text>}
    {!!routineNotice && <Text accessibilityLiveRegion="polite" style={{ color: theme.muted }}>{routineNotice}</Text>}
    {routineOpen && <RoutineDialog mode="choose" theme={theme} locationId={draft.locationId} close={() => setRoutineOpen(false)} choose={routine => {
      update(value => addRoutineToDraft(value, routine, randomUUID)); setRoutineOpen(false);
      setRoutineNotice(draft.locationId === routine.locationId ? `Added ${routine.name}. Change or skip anything you need.` : `Added ${routine.name}. Equipment labels were cleared for this location; check each exercise’s Setup.`);
    }} />}
    {status === 'Not saved' && <Button theme={theme} label="Retry save" onPress={() => update(value => ({ ...value }))} />}
    {pickerOpen && <ExercisePicker theme={theme} {...library} cancel={() => setPickerOpen(false)} add={(name, option, category, subcategory) => {
      const exercise = cardioDefault({ ...newExercise(), name, catalogId: option?.id, bodyweight: option?.bodyweight ?? false, tracking: option?.tracking, category, subcategory });
      requestScroll(exercise.id);
      update(value => ({ ...value, exercises: [...value.exercises, exercise] })); setAddedId(exercise.id); setPickerOpen(false);
    }} />}
    {draft && step && <>
      {step === 'details' ? <>
        <WorkoutSessionDetails draft={draft} locations={locations} theme={theme} busy={busy || addingGym}
          update={change => { setSetupError(''); update(change); }}
          removeLocation={async id => { setAddingGym(true); try { await removeLocation(id); } finally { setAddingGym(false); } }}
          addGym={async name => { setAddingGym(true); try { await addGym(name); } finally { setAddingGym(false); } }} />
        <Button theme={theme} variant="info" label="Choose routine" disabled={busy || addingGym || !draft.locationId} onPress={() => setRoutineOpen(true)} />
        <RecentSessions context={references} sessionType={draft.sessionType} theme={theme} open={id => router.push({ pathname: '/history/[id]', params: { id, returnToWorkout: '1' } })} />

      </> : <>
        <View style={[styles.card, { backgroundColor: theme.infoSoft, borderColor: theme.infoBorder, flexDirection: 'row', gap: 12, alignItems: 'center', flexWrap: 'wrap' }]}>
          <View style={{ flex: 1 }}><WorkoutSessionSummary draft={draft} locations={locations} theme={theme} /></View>
          <Button theme={theme} label="Edit details" disabled={busy} onPress={() => { setSetupError(''); setStep('details'); }} />
        </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <Text accessibilityRole="header" style={{ color: theme.text, fontSize: 18, flex: 1 }}>{draft.exercises.length} {draft.exercises.length === 1 ? 'exercise' : 'exercises'}</Text>
        <Button theme={theme} variant="info" label="Rest timer" disabled={busy} onPress={() => rest.open('Between exercises')} />
      </View>
      {draft.exercises.map((exercise, index) => <View key={exercise.id} testID={`exercise-card-${exercise.id}`} onLayout={event => onExerciseLayout(exercise.id, event)}><ExerciseEditor references={references} library={library.items} initiallyExpanded={index === 0 || exercise.id === addedId} exercise={exercise} index={index} theme={theme} disabled={busy} newId={randomUUID} restSeconds={rest.state?.seconds ?? 90} onRest={rest.quickStart} onSetLogged={rest.autoStart}
        update={next => update(value => ({ ...value, exercises: value.exercises.map(item => item.id === next.id ? next : item) }))}
        remove={() => update(value => ({ ...value, exercises: value.exercises.filter(item => item.id !== exercise.id) }))} /></View>)}
      {!draft.exercises.length && <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={{ color: theme.text }}>Add your first exercise</Text><Text style={[styles.subtitle, { color: theme.muted }]}>Choose a familiar exercise or start with a new one.</Text>
      </View>}
      <Button theme={theme} variant="add" label="+ Add exercise" disabled={busy} onPress={() => setPickerOpen(true)} />
      <Button theme={theme} variant="info" label="Paste workout notes" disabled={busy} onPress={() => setNotesOpen(true)} />
      <WorkoutLoggingHelp theme={theme} />

      </>}
      {!draft.exercises.length && <View style={[styles.card, { backgroundColor: theme.infoSoft, borderColor: theme.infoBorder }]}>
        <Text style={{ color: theme.text }}>Just recording a visit?</Text>
        <Text style={{ color: theme.muted }}>Save the session type, location and time without logging individual sets.</Text>
        <Button theme={theme} variant="info" label="Record workout only" disabled={busy || addingGym} onPress={recordWorkoutOnly} />
      </View>}

    </>}
  </Screen>;
}
