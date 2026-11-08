import { randomUUID } from 'expo-crypto';
import { useEffect, useRef, useState } from 'react';
import { BackHandler, Keyboard, Pressable, Text, View } from 'react-native';
import { type Location, type WorkoutDraft } from '../../domain/workout';
import { Button, Choice, Screen, styles } from '../../ui/controls';
import { fonts, type AppTheme } from '../../ui/theme';
import { ExerciseGroups } from '../exercises/ExerciseGroups';
import { ExerciseEditor } from './ExerciseEditor';
import { validReferenceContext } from '../../domain/workoutReferences';
import { newExercise } from './useWorkoutDraft';
import { ExercisePicker } from './ExercisePicker';
import { useExerciseLibrary } from './useExerciseLibrary';
import { WorkoutSessionDetails, WorkoutSessionSummary } from './WorkoutSessionDetails';
import { WorkoutLoggingHelp } from './WorkoutLoggingHelp';

export function SavedWorkoutEditor({ initial, locations, theme, save, cancel }: {
  initial: WorkoutDraft; locations: Location[]; theme: AppTheme;
  save: (draft: WorkoutDraft) => Promise<void>; cancel: () => void;
}) {
  const [draft, setDraft] = useState(initial);
  const [section, setSection] = useState<'details' | 'exercises'>('exercises');
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const saving = useRef(false);
  const library = useExerciseLibrary();
  const [pickerOpen, setPickerOpen] = useState(false);
  const references = validReferenceContext(draft);
  const focusedIndex = draft.exercises.findIndex(exercise => exercise.id === focusedId);
  const focused = draft.exercises[focusedIndex];
  const backToOverview = () => { if (!saving.current) { Keyboard.dismiss(); setFocusedId(null); } };
  useEffect(() => {
    if (!focusedId) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!saving.current) { Keyboard.dismiss(); setFocusedId(null); }
      return true;
    });
    return () => subscription.remove();
  }, [focusedId]);
  const footer = <>
    <Button theme={theme} primary label={busy ? 'Saving changes...' : 'Save changes'} disabled={busy} onPress={async () => {
      if (saving.current) return;
      if (!draft.exercises.length && !draft.recordOnly) { setError('Add an exercise with completed sets before saving, or choose workout-only recording.'); setSection('exercises'); return; }
      const incomplete = draft.exercises.find(exercise => !exercise.sets.length || exercise.sets.some(set => !set.completed));
      if (incomplete) {
        setError('Mark each set done, or remove the unfinished set or empty exercise, before saving.');
        setSection('exercises'); setFocusedId(incomplete.id); return;
      }
      saving.current = true; setBusy(true); setError('');
      try { await save({ ...draft, recordOnly: draft.exercises.length ? false : draft.recordOnly }); }
      catch (failure) { setError(failure instanceof Error && /choose|enter|name|mark|found/i.test(failure.message) ? failure.message : 'Unable to save changes. Your original workout is unchanged. Try again.'); }
      finally { saving.current = false; setBusy(false); }
    }} />
    <Button theme={theme} label="Cancel changes" disabled={busy} onPress={cancel} />
  </>;
  return <View style={{ flex: 1 }}>
    <View style={{ flex: 1, display: focused ? 'none' : 'flex' }} accessibilityElementsHidden={Boolean(focused)} importantForAccessibility={focused ? 'no-hide-descendants' : 'auto'}>
      <Screen theme={theme} key={section} footer={focused ? undefined : footer}>
        {pickerOpen && <ExercisePicker theme={theme} {...library} cancel={() => setPickerOpen(false)} add={(name, option, category, subcategory) => {
          const exercise = { ...newExercise(), name, catalogId: option?.id, bodyweight: option?.bodyweight ?? false, tracking: option?.tracking, category, subcategory };
          setDraft(value => ({ ...value, exercises: [...value.exercises, exercise] })); setError(''); setPickerOpen(false); setFocusedId(exercise.id);
        }} />}
        <Text accessibilityRole="header" style={[styles.heading, { color: theme.text }]}>Edit workout</Text>
        <Text style={[styles.subtitle, { color: theme.muted }]}>Changes stay pending until you tap Save changes.</Text>
        <Choice theme={theme} label="Edit section" value={section} disabled={busy}
          options={[{ value: 'details', label: 'Session details' }, { value: 'exercises', label: 'Exercises' }]} onChange={value => { setSection(value); setFocusedId(null); }} />
        {section === 'details' ? <WorkoutSessionDetails draft={draft} locations={locations} theme={theme} busy={busy} update={change => { setError(''); setDraft(change); }} /> : <>
          <View style={[styles.card, { backgroundColor: theme.infoSoft, borderColor: theme.infoBorder }]}><WorkoutSessionSummary draft={draft} locations={locations} theme={theme} /></View>
          <Text style={{ color: theme.muted }}>{draft.exercises.length} {draft.exercises.length === 1 ? 'exercise' : 'exercises'} / choose one to edit</Text>
          <ExerciseGroups items={draft.exercises} theme={theme} renderItem={exercise => {
            const position = draft.exercises.findIndex(item => item.id === exercise.id) + 1;
            const completed = exercise.sets.filter(set => set.completed).length;
            return <Pressable accessibilityRole="button" accessibilityLabel={'Edit ' + exercise.name + ', exercise ' + position} disabled={busy} accessibilityState={{ disabled: busy }} onPress={() => { Keyboard.dismiss(); setFocusedId(exercise.id); }}
              style={{ minHeight: 68, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={{ color: theme.text, fontFamily: fonts.bold, fontSize: 17 }}>{exercise.name || 'Unnamed exercise'}</Text>
                <Text style={{ color: completed === exercise.sets.length && completed > 0 ? theme.success : theme.muted, fontSize: 12 }}>{completed}/{exercise.sets.length} sets done</Text>
              </View>
              <Text accessible={false} style={{ color: theme.info, fontFamily: fonts.bold }}>Edit</Text>
            </Pressable>;
          }} />
          {!draft.exercises.length && <Text style={{ color: theme.muted }}>No exercises in this workout. Add an exercise or cancel your changes.</Text>}
          {!draft.exercises.length && <Choice theme={theme} label="Recording" value={draft.recordOnly ? 'visit' : 'sets'} disabled={busy}
            options={[{ value: 'sets', label: 'Log exercises' }, { value: 'visit', label: 'Workout only' }]} onChange={value => setDraft(current => ({ ...current, recordOnly: value === 'visit' }))} />}
          <Button theme={theme} variant="add" label="+ Add exercise" disabled={busy} onPress={() => setPickerOpen(true)} />
        </>}
        {!!error && !focused && <Text accessibilityRole="alert" style={{ color: theme.danger }}>{error}</Text>}
      </Screen>
    </View>
    {focused && <Screen theme={theme} footer={footer}>
        <Button theme={theme} variant="link" label="Back to exercises" disabled={busy} onPress={backToOverview} />
        <Text accessibilityRole="header" style={[styles.heading, { color: theme.text }]}>Edit exercise</Text>
        <Text style={{ color: theme.muted, fontSize: 12 }}>Return to the overview when done. Save changes applies the whole workout.</Text>
        <ExerciseEditor key={focused.id} references={references} library={library.items} initiallyExpanded theme={theme} exercise={focused} index={focusedIndex} disabled={busy} newId={randomUUID}
          update={next => { setError(''); setDraft(value => ({ ...value, exercises: value.exercises.map(item => item.id === next.id ? next : item) })); }}
          remove={() => { setDraft(value => ({ ...value, exercises: value.exercises.filter(item => item.id !== focused.id) })); setError(''); setFocusedId(null); }} />
        <WorkoutLoggingHelp theme={theme} editing />
        {!!error && <Text accessibilityRole="alert" style={{ color: theme.danger }}>{error}</Text>}
    </Screen>}
  </View>;
}
