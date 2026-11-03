import { Text, View } from 'react-native';
import type { WorkoutDraft } from '../../domain/workout';
import { initialTiming } from '../../domain/workoutTime';
import { Field, styles } from '../../ui/controls';
import type { AppTheme } from '../../ui/theme';

export function WorkoutTimeEditor({ draft, theme, disabled, update }: {
  draft: WorkoutDraft; theme: AppTheme; disabled: boolean; update: (timing: NonNullable<WorkoutDraft['timing']>) => void;
}) {
  const timing = initialTiming(draft, new Date().toISOString());
  return <View style={[styles.card, { backgroundColor: theme.surface }]}>
    <Text accessibilityRole="header" style={{ color: theme.text }}>Workout date and time</Text>
    <Text style={[styles.subtitle, { color: theme.muted }]}>Use the date you trained, even when logging later. Times are in {draft.timezone} (24-hour). An overnight session can end on the next date.</Text>
    {!draft.endedAt && !draft.timing && <Text style={{ color: theme.muted }}>End time follows Finish workout unless you edit these fields.</Text>}
    <Field theme={theme} label="Start date" placeholder="YYYY-MM-DD" value={timing.startDate} editable={!disabled} autoCorrect={false}
      onChangeText={startDate => update({ ...timing, startDate, endDate: timing.endDate === timing.startDate ? startDate : timing.endDate })} />
    <Field theme={theme} label="Start time" placeholder="HH:mm" value={timing.startTime} editable={!disabled} autoCorrect={false}
      onChangeText={startTime => update({ ...timing, startTime })} />
    <Field theme={theme} label="End date" placeholder="YYYY-MM-DD" value={timing.endDate} editable={!disabled} autoCorrect={false}
      onChangeText={endDate => update({ ...timing, endDate })} />
    <Field theme={theme} label="End time" placeholder="HH:mm" value={timing.endTime} editable={!disabled} autoCorrect={false}
      onChangeText={endTime => update({ ...timing, endTime })} />
  </View>;
}
