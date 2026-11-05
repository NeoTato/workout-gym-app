import { useState } from 'react';
import { Alert, Pressable, Text, View, useWindowDimensions } from 'react-native';
import type { Convention, ExerciseDraft, LoadUnit, SetDraft } from '../../domain/workout';
import { canCompleteSet } from '../../domain/workout';
import { Button, Choice, Field, styles } from '../../ui/controls';
import { fonts, type AppTheme } from '../../ui/theme';
import type { LoggedExercise } from '../../domain/exerciseLibrary';
import { ExerciseNameField } from './ExerciseNameField';
import { SetRow } from './SetRow';
import { ExerciseCategoryField } from './ExerciseCategoryField';
import type { ReferenceContext } from '../../domain/workoutReferences';
import { PreviousExerciseSets } from './WorkoutReferences';

export function ExerciseEditor({ exercise, index, theme, disabled, update, remove, newId, library = [], initiallyExpanded = index === 0, references }: {
  exercise: ExerciseDraft; index: number; theme: AppTheme; disabled: boolean;
  update: (exercise: ExerciseDraft) => void; remove: () => void; newId: () => string;
  library?: LoggedExercise[]; initiallyExpanded?: boolean;
  references?: ReferenceContext | null;
}) {
  const [expanded, setExpanded] = useState(initiallyExpanded);
  const [setup, setSetup] = useState(!exercise.name);
  const largeText = useWindowDimensions().fontScale > 1.3;
  const completed = exercise.sets.filter(set => set.completed).length;
  function changeSet(id: string, patch: Partial<SetDraft>) {
    update({ ...exercise, sets: exercise.sets.map(set => {
      if (set.id !== id) return set;
      const next = { ...set, ...patch };
      const valid = canCompleteSet(next, exercise.bodyweight);
      return { ...next, completed: valid && (patch.weight !== undefined || patch.reps !== undefined ? true : next.completed) };
    }) });
  }
  function confirmRemove(action: () => void, completed: boolean) {
    if (!completed) return action();
    Alert.alert('Remove completed work?', 'These sets will be removed from this workout.', [{ text: 'Keep', style: 'cancel' }, { text: 'Remove', style: 'destructive', onPress: action }]);
  }
  return <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
    <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
      <Pressable accessibilityRole="button" accessibilityLabel={(expanded ? 'Collapse' : 'Expand') + ' exercise ' + (index + 1)} accessibilityState={{ expanded, disabled }} disabled={disabled}
        onPress={() => setExpanded(value => !value)} style={{ flex: 1, minHeight: 44, justifyContent: 'center', gap: 4 }}>
        <Text accessibilityRole="header" style={{ color: theme.text, fontFamily: fonts.bold, fontSize: 17 }}>{exercise.name || ('Exercise ' + (index + 1))}</Text>
        <Text style={{ color: theme.muted, fontSize: 12 }}>{completed}/{exercise.sets.length} sets done {expanded ? '-' : '+'}</Text>
      </Pressable>
      <Button theme={theme} variant="link" label="Setup" accessibilityLabel={'Exercise ' + (index + 1) + ' settings'} disabled={disabled}
        onPress={() => { setExpanded(true); setSetup(value => !value); }} />
    </View>
    {expanded && <>
    {setup && <>
    <ExerciseNameField exercise={exercise} index={index} theme={theme} disabled={disabled} items={library} update={update} />
    <ExerciseCategoryField value={exercise.category ?? ''} subcategory={exercise.subcategory ?? ''} theme={theme} disabled={disabled}
      onChange={category => update({ ...exercise, category, subcategory: category === exercise.category ? exercise.subcategory : '' })}
      onSubcategoryChange={subcategory => update({ ...exercise, subcategory })} />
    <Field theme={theme} label={`Exercise ${index + 1} equipment label`} caption="Equipment / setup" value={exercise.equipment} placeholder="e.g. Dumbbells or chest machine 1" editable={!disabled}
      onChangeText={equipment => update({ ...exercise, equipment })} />
    <Choice theme={theme} label="Tracking" value={exercise.bodyweight ? 'bodyweight' : 'loaded'} disabled={disabled}
      options={[{ value: 'loaded', label: 'Load + reps' }, { value: 'bodyweight', label: 'Bodyweight reps' }]}
      onChange={value => update({ ...exercise, bodyweight: value === 'bodyweight', sets: exercise.sets.map(set => ({ ...set, completed: false })) })} />
    {!exercise.bodyweight && <>
      <Choice<LoadUnit> theme={theme} label="Load unit" value={exercise.unit} disabled={disabled} options={[{ value: 'lb', label: 'lbs' }, { value: 'kg', label: 'kg' }, { value: 'plates', label: 'Plates' }]}
        onChange={unit => update({ ...exercise, unit, sets: exercise.sets.map(set => ({ ...set, completed: false })) })} />
      <Choice<Convention> theme={theme} label="Load means" value={exercise.convention} disabled={disabled} options={[{ value: 'total', label: 'Total' }, { value: 'per_hand', label: 'Per hand' }, { value: 'per_side', label: 'Per side' }]}
        onChange={convention => update({ ...exercise, convention, sets: exercise.sets.map(set => ({ ...set, completed: false })) })} />
    </>}
    <Button theme={theme} variant="danger" label={`Remove exercise ${index + 1}`} disabled={disabled} onPress={() => confirmRemove(remove, exercise.sets.some(set => set.completed))} />
    <Button theme={theme} label="Done setup" disabled={disabled} onPress={() => setSetup(false)} />
    </>}
    <Text style={{ color: theme.muted, fontSize: 12 }}>{exercise.bodyweight ? 'Bodyweight reps' : ((exercise.unit === 'lb' ? 'lbs' : exercise.unit) + ' / ' + exercise.convention.replace('_', ' '))}{exercise.equipment ? ' / ' + exercise.equipment : ''}</Text>
    {references !== undefined && <PreviousExerciseSets context={references} exercise={exercise} theme={theme} />}
    {!largeText && exercise.sets.length > 0 && <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Text style={{ width: 22, color: theme.muted, fontSize: 10 }}>SET</Text>
      <View style={{ flex: 1, flexDirection: 'row', gap: 6 }}>
        {!exercise.bodyweight && <Text style={{ flex: 1, color: theme.muted, textAlign: 'center', fontSize: 10 }}>LOAD</Text>}
        <Text style={{ flex: 1, color: theme.muted, textAlign: 'center', fontSize: 10 }}>REPS</Text>
      </View>
      <Text style={{ width: 44, color: theme.muted, textAlign: 'center', fontSize: 10 }}>DONE</Text><View style={{ width: 44 }} />
    </View>}
    <View>{exercise.sets.map((set, setIndex) => <SetRow key={set.id} set={set} index={setIndex} exerciseIndex={index} theme={theme} unit={exercise.unit}
      bodyweight={exercise.bodyweight} disabled={disabled} largeText={largeText} change={patch => changeSet(set.id, patch)}
      remove={() => confirmRemove(() => update({ ...exercise, sets: exercise.sets.filter(item => item.id !== set.id) }), set.completed)} />)}</View>
    <Button theme={theme} variant="add" label="+ Add set" disabled={disabled} onPress={() => {
      const last = exercise.sets.at(-1);
      update({ ...exercise, sets: [...exercise.sets, { id: newId(), weight: last?.weight ?? '', reps: last?.reps ?? '', completed: false }] });
    }} />

    </>}
  </View>;
}
