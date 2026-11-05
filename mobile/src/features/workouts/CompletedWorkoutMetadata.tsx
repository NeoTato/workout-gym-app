import { Text, View } from 'react-native';
import type { SavedWorkout } from '../../domain/workout';
import { timeFields } from '../../domain/workoutTime';
import { styles } from '../../ui/controls';
import { fonts, type AppTheme } from '../../ui/theme';

export function CompletedWorkoutMetadata({ workout, theme, showDate = true }: {
  workout: Pick<SavedWorkout, 'startedAt' | 'endedAt' | 'timezone' | 'locationName'>; theme: AppTheme; showDate?: boolean;
}) {
  const start = timeFields(workout.startedAt, workout.timezone);
  const end = timeFields(workout.endedAt, workout.timezone);
  const date = new Intl.DateTimeFormat('en', { timeZone: workout.timezone, weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(workout.startedAt));
  const endDate = start.date === end.date ? '' : new Intl.DateTimeFormat('en', {
    timeZone: workout.timezone, month: 'short', day: 'numeric',
    ...(start.date.slice(0, 4) !== end.date.slice(0, 4) ? { year: 'numeric' as const } : {}),
  }).format(new Date(workout.endedAt)) + ', ';
  const minutes = Math.max(0, Math.round((Date.parse(workout.endedAt) - Date.parse(workout.startedAt)) / 60000));
  const hours = Math.floor(minutes / 60), remainder = minutes % 60;
  const duration = hours ? `${hours} hr${remainder ? ` ${remainder} min` : ''}` : minutes ? `${minutes} min` : '<1 min';
  return <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border, gap: 8 }]}>
    {showDate && <Text style={{ color: theme.text, fontFamily: fonts.bold, fontSize: 18 }}>{date}</Text>}
    <Text style={[styles.subtitle, { color: theme.text }]}>{start.time} – {endDate}{end.time} · {duration}</Text>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 16, rowGap: 4, justifyContent: 'space-between' }}>
      <Text style={{ color: theme.muted }}>{workout.locationName}</Text>
      <Text style={{ color: theme.muted, fontSize: 12 }}>{workout.timezone}</Text>
    </View>
  </View>;
}
