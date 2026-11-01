import { randomUUID } from 'expo-crypto';
import { useRef, useState } from 'react';
import { Text } from 'react-native';
import { sessionTypes, type Location, type WorkoutDraft } from '../../domain/workout';
import { Button, Choice, styles } from '../../ui/controls';
import type { AppTheme } from '../../ui/theme';
import { ExerciseEditor } from './ExerciseEditor';
import { newExercise } from './useWorkoutDraft';

export function SavedWorkoutEditor({ initial, locations, theme, save, cancel }: {
  initial: WorkoutDraft; locations: Location[]; theme: AppTheme;
  save: (draft: WorkoutDraft) => Promise<void>; cancel: () => void;
}) {
  const [draft, setDraft] = useState(initial);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const saving = useRef(false);
  return <>
    <Text accessibilityRole="header" style={[styles.heading, { color: theme.text }]}>Edit workout</Text>
    <Text style={[styles.subtitle, { color: theme.muted }]}>Changes are saved only when you tap Save changes. The original date and times stay the same.</Text>
    <Choice theme={theme} label="Workout location" value={draft.locationId} disabled={busy}
      options={locations.map(location => ({ value: location.id, label: location.name }))}
      onChange={locationId => setDraft(value => ({ ...value, locationId }))} />
    <Choice theme={theme} label="Session type" value={draft.sessionType} disabled={busy}
      options={sessionTypes.map(type => ({ value: type, label: type }))}
      onChange={sessionType => setDraft(value => ({ ...value, sessionType }))} />
    {draft.exercises.map((exercise, index) => <ExerciseEditor key={exercise.id} theme={theme} exercise={exercise} index={index} disabled={busy} newId={randomUUID}
      update={next => setDraft(value => ({ ...value, exercises: value.exercises.map(item => item.id === next.id ? next : item) }))}
      remove={() => setDraft(value => ({ ...value, exercises: value.exercises.filter(item => item.id !== exercise.id) }))} />)}
    <Button theme={theme} label="+ Add exercise" disabled={busy} onPress={() => setDraft(value => ({ ...value, exercises: [...value.exercises, newExercise()] }))} />
    <Text style={[styles.subtitle, { color: theme.muted }]}>Valid load and reps automatically complete a set; bodyweight sets need reps only. Copied sets stay incomplete until edited or marked done. Complete or remove every set before saving.</Text>
    {!!error && <Text accessibilityRole="alert" style={{ color: theme.accent }}>{error}</Text>}
    <Button theme={theme} primary label={busy ? 'Saving changes…' : 'Save changes'} disabled={busy} onPress={async () => {
      if (saving.current) return;
      if (draft.exercises.some(exercise => !exercise.sets.length || exercise.sets.some(set => !set.completed))) {
        setError('Mark each set done, or remove the unfinished set or empty exercise, before saving.'); return;
      }
      saving.current = true; setBusy(true); setError('');
      try { await save(draft); }
      catch (failure) { setError(failure instanceof Error && /choose|enter|name|mark|found/i.test(failure.message) ? failure.message : 'Unable to save changes. Your original workout is unchanged. Try again.'); }
      finally { saving.current = false; setBusy(false); }
    }} />
    <Button theme={theme} label="Cancel changes" disabled={busy} onPress={cancel} />
  </>;
}
