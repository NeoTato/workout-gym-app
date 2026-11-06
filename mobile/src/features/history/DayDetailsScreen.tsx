import { Text, View } from 'react-native';
import type { SavedWorkout } from '../../domain/workout';
import { calendarDateLabel, type LocationFilter } from '../../domain/workoutCalendar';
import { CompletedExerciseSummary } from '../workouts/CompletedExerciseSummary';
import { ExerciseGroups } from '../exercises/ExerciseGroups';
import { CompletedWorkoutMetadata } from '../workouts/CompletedWorkoutMetadata';
import { Button, Screen, styles } from '../../ui/controls';
import { fonts, type AppTheme } from '../../ui/theme';

export function DayDetailsScreen({ date, filter, workouts, error, retry, back, open, theme }: {
  date: string; filter: LocationFilter; workouts: SavedWorkout[] | null; error: string;
  retry: () => void; back: () => void; open: (id: string) => void; theme: AppTheme;
}) {
  let title = 'Day details';
  try { title = calendarDateLabel(date); } catch { /* Invalid links are reported by the query state below. */ }
  return <Screen theme={theme}>
    <Button theme={theme} variant="link" label="Back to calendar" onPress={back} />
    <Text accessibilityRole="header" style={[styles.heading, { color: theme.text }]}>{title}</Text>
    <Text style={{ color: theme.muted }}>{filter === 'all' ? 'All locations' : filter === 'gym' ? 'Gyms' : 'Home'}</Text>
    {!!error && <><Text accessibilityRole="alert" style={{ color: theme.danger }}>{error}</Text><Button theme={theme} label="Retry day" onPress={retry} /></>}
    {!error && !workouts && <Text style={{ color: theme.muted }}>Loading completed workouts…</Text>}
    {!error && workouts?.length === 0 && <Text style={{ color: theme.muted }}>No completed workouts on this day.</Text>}
    {!error && workouts && workouts.length > 0 && <Text style={{ color: theme.muted }}>{workouts.length} {workouts.length === 1 ? 'workout' : 'workouts'}</Text>}
    {!error && workouts?.map(workout => <View key={workout.id} style={{ gap: 12, marginTop: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Text accessibilityRole="header" style={{ flex: 1, color: theme.text, fontFamily: fonts.bold, fontSize: 22 }}>{workout.sessionType}</Text>
        <Button theme={theme} variant="link" label="View / edit" accessibilityLabel={`View or edit ${workout.sessionType} workout`} onPress={() => open(workout.id)} />
      </View>
      <CompletedWorkoutMetadata workout={workout} theme={theme} showDate={false} />
      <ExerciseGroups items={workout.exercises} theme={theme} renderItem={exercise => <CompletedExerciseSummary exercise={exercise} theme={theme} />} />
    </View>)}
  </Screen>;
}
