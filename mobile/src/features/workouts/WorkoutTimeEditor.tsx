import { Text, View } from 'react-native';
import type { WorkoutDraft } from '../../domain/workout';
import { initialTiming, timeFields } from '../../domain/workoutTime';
import { styles } from '../../ui/controls';
import type { AppTheme } from '../../ui/theme';
import { DateTimeField } from './DateTimeField';

export function WorkoutTimeEditor({ draft, theme, disabled, update }: {
  draft: WorkoutDraft; theme: AppTheme; disabled: boolean; update: (timing: NonNullable<WorkoutDraft['timing']>) => void;
}) {
  const timing = initialTiming(draft, new Date().toISOString());
  const maximumDate = timeFields(new Date().toISOString(), draft.timezone).date;
  return <View style={[styles.card, { backgroundColor: theme.surface }]}>
    <Text accessibilityRole="header" style={{ color: theme.text }}>Workout date and time</Text>
    <Text style={[styles.subtitle, { color: theme.muted }]}>Use the date you trained, even when logging later. Times are in {draft.timezone}. An overnight session can end on the next date.</Text>
    {!draft.endedAt && !draft.timing && <Text style={{ color: theme.muted }}>End time follows Finish workout unless you edit these fields.</Text>}
    <DateTimeField theme={theme} label="Start date" mode="date" date={timing.startDate} time={timing.startTime} maximumDate={maximumDate} disabled={disabled}
      onChange={startDate => update({ ...timing, startDate, endDate: timing.endDate === timing.startDate ? startDate : timing.endDate })} />
    <DateTimeField theme={theme} label="Start time" mode="time" date={timing.startDate} time={timing.startTime} maximumDate={maximumDate} disabled={disabled}
      onChange={startTime => update({ ...timing, startTime })} />
    <DateTimeField theme={theme} label="End date" mode="date" date={timing.endDate} time={timing.endTime} maximumDate={maximumDate} disabled={disabled}
      onChange={endDate => update({ ...timing, endDate })} />
    <DateTimeField theme={theme} label="End time" mode="time" date={timing.endDate} time={timing.endTime} maximumDate={maximumDate} disabled={disabled}
      onChange={endTime => update({ ...timing, endTime })} />
  </View>;
}
