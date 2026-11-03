import { Alert, Pressable, Text, View } from 'react-native';
import type { Convention, ExerciseDraft, LoadUnit, SetDraft } from '../../domain/workout';
import { canCompleteSet } from '../../domain/workout';
import { Button, Choice, Field, styles } from '../../ui/controls';
import { fonts, type AppTheme } from '../../ui/theme';

export function ExerciseEditor({ exercise, index, theme, disabled, update, remove, newId }: {
  exercise: ExerciseDraft; index: number; theme: AppTheme; disabled: boolean;
  update: (exercise: ExerciseDraft) => void; remove: () => void; newId: () => string;
}) {
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
    Alert.alert('Remove completed work?', 'These sets will be removed from this draft.', [{ text: 'Keep', style: 'cancel' }, { text: 'Remove', style: 'destructive', onPress: action }]);
  }
  return <View style={[styles.card, { backgroundColor: theme.surface }]}>
    <Text accessibilityRole="header" style={{ color: theme.text, fontFamily: fonts.bold, fontSize: 18 }}>Exercise {index + 1}</Text>
    <Field theme={theme} label={`Exercise ${index + 1} name`} caption="Exercise name" value={exercise.name} placeholder="e.g. Incline dumbbell press" editable={!disabled}
      onChangeText={name => update({ ...exercise, name })} />
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
    {exercise.sets.map((set, setIndex) => <View key={set.id} style={{ gap: 12, borderTopWidth: 1, borderTopColor: theme.background, paddingTop: 16 }}>
      <Text style={{ color: theme.muted, fontFamily: fonts.bold }}>Set {setIndex + 1}</Text>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        {!exercise.bodyweight && <Field theme={theme} label={`Exercise ${index + 1} set ${setIndex + 1} load (${exercise.unit})`} caption={`Load (${exercise.unit === 'lb' ? 'lbs' : exercise.unit})`} value={set.weight} editable={!disabled}
          keyboardType="decimal-pad" onChangeText={weight => changeSet(set.id, { weight })} />}
        <Field theme={theme} label={`Exercise ${index + 1} set ${setIndex + 1} reps`} caption="Reps" value={set.reps} editable={!disabled}
          keyboardType="number-pad" onChangeText={reps => changeSet(set.id, { reps })} />
      </View>
      <Pressable accessibilityRole="checkbox" accessibilityLabel={`Exercise ${index + 1} set ${setIndex + 1} done`} aria-checked={set.completed}
        accessibilityHint={exercise.bodyweight ? 'Enter valid reps to complete this set.' : 'Enter a valid load and reps to complete this set.'}
        accessibilityState={{ checked: set.completed, disabled: disabled || !canCompleteSet(set, exercise.bodyweight) }} disabled={disabled || !canCompleteSet(set, exercise.bodyweight)}
        onPress={() => changeSet(set.id, { completed: !set.completed })} style={[styles.button, { backgroundColor: theme.accentSoft, opacity: disabled || !canCompleteSet(set, exercise.bodyweight) ? 0.5 : 1 }]}>
        <Text style={{ color: theme.accent, fontFamily: fonts.bold }}>{set.completed ? '✓ Done · tap to undo' : canCompleteSet(set, exercise.bodyweight) ? 'Mark set done' : exercise.bodyweight ? 'Enter reps to complete' : 'Enter load and reps to complete'}</Text>
      </Pressable>
      <Button theme={theme} label={`Remove set ${setIndex + 1}`} disabled={disabled} onPress={() => confirmRemove(() => update({ ...exercise, sets: exercise.sets.filter(item => item.id !== set.id) }), set.completed)} />
    </View>)}
    <Button theme={theme} label="+ Add set" disabled={disabled} onPress={() => {
      const last = exercise.sets.at(-1);
      update({ ...exercise, sets: [...exercise.sets, { id: newId(), weight: last?.weight ?? '', reps: last?.reps ?? '', completed: false }] });
    }} />
    <Button theme={theme} label={`Remove exercise ${index + 1}`} disabled={disabled} onPress={() => confirmRemove(remove, exercise.sets.some(set => set.completed))} />
  </View>;
}
