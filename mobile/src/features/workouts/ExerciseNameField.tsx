import { useState } from 'react';
import { Text, View } from 'react-native';
import { matchingExercises, type LoggedExercise } from '../../domain/exerciseLibrary';
import type { ExerciseDraft } from '../../domain/workout';
import { Button, Field } from '../../ui/controls';
import type { AppTheme } from '../../ui/theme';

export function ExerciseNameField({ exercise, index, theme, disabled, items, update }: {
  exercise: ExerciseDraft; index: number; theme: AppTheme; disabled: boolean; items: LoggedExercise[];
  update: (exercise: ExerciseDraft) => void;
}) {
  const [suggesting, setSuggesting] = useState(false);
  const matches = matchingExercises(items, exercise.name).slice(0, 8);
  return <View style={{ gap: 8 }}>
    <Field theme={theme} label={`Exercise ${index + 1} name`} caption="Exercise name" value={exercise.name} editable={!disabled} autoCorrect={false}
      placeholder="Search or name your exercise" onFocus={() => setSuggesting(true)}
      onChangeText={name => { setSuggesting(true); update({ ...exercise, name }); }} />
    {suggesting && matches.length > 0 && <>
      <Text style={{ color: theme.muted, fontSize: 12 }}>Previously logged</Text>
      {matches.map(item => <Button key={item.id} theme={theme} disabled={disabled}
        label={`${item.name} · ${item.bodyweight ? 'Bodyweight' : 'Load + reps'}`} accessibilityLabel={`Use ${item.name}, ${item.bodyweight ? 'bodyweight' : 'load and reps'}`}
        onPress={() => {
          update({ ...exercise, catalogId: item.id, name: item.name, bodyweight: item.bodyweight,
            sets: exercise.bodyweight === item.bodyweight ? exercise.sets : exercise.sets.map(set => ({ ...set, completed: false })) });
          setSuggesting(false);
        }} />)}
      <Button theme={theme} variant="link" label="Hide suggestions" disabled={disabled} onPress={() => setSuggesting(false)} />
    </>}
  </View>;
}
