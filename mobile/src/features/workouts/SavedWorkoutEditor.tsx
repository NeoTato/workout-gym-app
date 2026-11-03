import { randomUUID } from 'expo-crypto';
import { useRef, useState } from 'react';
import { Text } from 'react-native';
import { type Location, type WorkoutDraft } from '../../domain/workout';
import { Button, Choice, Screen, styles } from '../../ui/controls';
import type { AppTheme } from '../../ui/theme';
import { ExerciseEditor } from './ExerciseEditor';
import { newExercise } from './useWorkoutDraft';
import { WorkoutSessionDetails, WorkoutSessionSummary } from './WorkoutSessionDetails';

export function SavedWorkoutEditor({ initial, locations, theme, save, cancel }: {
  initial: WorkoutDraft; locations: Location[]; theme: AppTheme;
  save: (draft: WorkoutDraft) => Promise<void>; cancel: () => void;
}) {
  const [draft, setDraft] = useState(initial);
  const [section, setSection] = useState<'details' | 'exercises'>('details');
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const saving = useRef(false);
  return <Screen theme={theme} key={section}>
    <Text accessibilityRole="header" style={[styles.heading, { color: theme.text }]}>Edit workout</Text>
    <Text style={[styles.subtitle, { color: theme.muted }]}>Changes are saved only when you tap Save changes.</Text>
    <Choice theme={theme} label="Edit section" value={section} disabled={busy}
      options={[{ value: 'details', label: 'Session details' }, { value: 'exercises', label: 'Exercises' }]} onChange={setSection} />
    {section === 'details' ? <WorkoutSessionDetails draft={draft} locations={locations} theme={theme} busy={busy} update={setDraft} /> : <>
    <WorkoutSessionSummary draft={draft} locations={locations} theme={theme} />
    {draft.exercises.map((exercise, index) => <ExerciseEditor key={exercise.id} theme={theme} exercise={exercise} index={index} disabled={busy} newId={randomUUID}
      update={next => setDraft(value => ({ ...value, exercises: value.exercises.map(item => item.id === next.id ? next : item) }))}
      remove={() => setDraft(value => ({ ...value, exercises: value.exercises.filter(item => item.id !== exercise.id) }))} />)}
    <Button theme={theme} label="+ Add exercise" disabled={busy} onPress={() => setDraft(value => ({ ...value, exercises: [...value.exercises, newExercise()] }))} />
    <Text style={[styles.subtitle, { color: theme.muted }]}>Valid load and reps automatically complete a set; bodyweight sets need reps only. Copied sets stay incomplete until edited or marked done. Complete or remove every set before saving.</Text>
    </>}
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
  </Screen>;
}
