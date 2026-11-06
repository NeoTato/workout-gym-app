import { router, useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native';
import { localDate } from '../../domain/workout';
import { ExerciseProgressScreen } from '../../features/progress/ExerciseProgressScreen';
import { useExerciseProgress } from '../../features/progress/useExerciseProgress';
import { Button, Screen } from '../../ui/controls';
import { useAppTheme } from '../../ui/appearanceContext';

export default function ExerciseProgressRoute() {
  const { id, variationId } = useLocalSearchParams<{ id: string; variationId?: string }>();
  const theme = useAppTheme(), { data, error, retry, refreshing } = useExerciseProgress(id, localDate(new Date()));
  const back = () => { if (router.canGoBack()) router.back(); else router.replace('/progress'); };
  if (!data) return <Screen theme={theme}>
    <Button theme={theme} variant="link" label="Back" onPress={back} />
    <Text accessibilityRole={error ? 'alert' : undefined} style={{ color: error ? theme.danger : theme.muted }}>{error || 'Loading exercise history...'}</Text>
    {!!error && <Button theme={theme} label="Retry exercise history" onPress={retry} />}
  </Screen>;
  return <ExerciseProgressScreen key={`${id}:${variationId ?? ''}`} name={data.exercise.name} variations={data.variations} theme={theme} back={back} initialVariationId={variationId} refreshing={refreshing}
    openWorkout={workoutId => router.push({ pathname: '/history/[id]', params: { id: workoutId, returnToProgress: '1' } })} />;
}
