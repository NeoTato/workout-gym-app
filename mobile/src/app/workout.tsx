import { randomUUID } from 'expo-crypto';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Text, View, useColorScheme } from 'react-native';

import { sessionTypes } from '../domain/workout';
import { ExerciseEditor } from '../features/workouts/ExerciseEditor';
import { WorkoutTimeEditor } from '../features/workouts/WorkoutTimeEditor';
import { newExercise, useWorkoutDraft } from '../features/workouts/useWorkoutDraft';
import { Button, Choice, Field, Screen, styles } from '../ui/controls';
import { fonts, getTheme } from '../ui/theme';

export default function WorkoutRoute() {
  const theme = getTheme(useColorScheme());
  const { draft, locations, status, error, busy, update, addGym, finish, discard } = useWorkoutDraft();
  const [gymName, setGymName] = useState(''), [gymError, setGymError] = useState('');
  const [addingGym, setAddingGym] = useState(false);
  return <Screen theme={theme}>
    <Button theme={theme} label="← Home · keep draft" disabled={busy} onPress={() => router.replace('/')} />
    <Text accessibilityRole="header" style={[styles.heading, { color: theme.text }]}>Your workout</Text>
    <Text accessibilityLiveRegion="polite" style={[styles.subtitle, { color: theme.muted }]}>{status}</Text>
    {!!error && <Text accessibilityRole="alert" style={{ color: theme.accent }}>{error}</Text>}
    {status === 'Not saved' && <Button theme={theme} label="Retry save" onPress={() => update(value => ({ ...value }))} />}
    {draft && <>
      <WorkoutTimeEditor draft={draft} theme={theme} disabled={busy} update={timing => update(value => ({ ...value, timing }))} />
      <View style={[styles.card, { backgroundColor: theme.surface }]}>
        <Text style={{ color: theme.muted, fontFamily: fonts.medium }}>{draft.timing?.startDate ?? draft.activityDate} · Do as much as fits your session.</Text>
        <Choice theme={theme} label="Where are you working out?" value={draft.locationId} disabled={busy}
          options={locations.map(location => ({ value: location.id, label: location.name }))}
          onChange={locationId => update(value => ({ ...value, locationId }))} />
        <Field theme={theme} label="New gym name" value={gymName} editable={!busy && !addingGym} onChangeText={setGymName} placeholder="Add another gym" />
        <Button theme={theme} label={addingGym ? 'Adding gym…' : '+ Add gym'} disabled={busy || addingGym} onPress={async () => {
          setAddingGym(true); setGymError('');
          try { await addGym(gymName); setGymName(''); } catch { setGymError('Enter a gym name other than Home, or try again if storage is unavailable.'); }
          finally { setAddingGym(false); }
        }} />
        {!!gymError && <Text accessibilityRole="alert" style={{ color: theme.accent }}>{gymError}</Text>}
        <Choice theme={theme} label="Session type" value={draft.sessionType} disabled={busy} options={sessionTypes.map(type => ({ value: type, label: type }))}
          onChange={sessionType => update(value => ({ ...value, sessionType }))} />
      </View>
      {draft.exercises.map((exercise, index) => <ExerciseEditor key={exercise.id} exercise={exercise} index={index} theme={theme} disabled={busy} newId={randomUUID}
        update={next => update(value => ({ ...value, exercises: value.exercises.map(item => item.id === next.id ? next : item) }))}
        remove={() => update(value => ({ ...value, exercises: value.exercises.filter(item => item.id !== exercise.id) }))} />)}
      <Button theme={theme} label="+ Add exercise" disabled={busy} onPress={() => update(value => ({ ...value, exercises: [...value.exercises, newExercise()] }))} />
      <Text style={[styles.subtitle, { color: theme.muted }]}>Only sets marked done will be saved as performed. There is no required exercise or set count.</Text>
      <Button theme={theme} primary label={busy ? 'Please wait…' : 'Finish workout'} disabled={busy || addingGym} onPress={async () => {
        const id = await finish(); if (id) router.replace({ pathname: '/history/[id]', params: { id } });
      }} />
      <Button theme={theme} label="Discard workout" disabled={busy || addingGym} onPress={() => Alert.alert('Discard this workout?', 'This removes the unfinished draft from this phone.', [
        { text: 'Keep workout', style: 'cancel' }, { text: 'Discard', style: 'destructive', onPress: async () => { if (await discard()) router.replace('/'); } },
      ])} />
    </>}
  </Screen>;
}
