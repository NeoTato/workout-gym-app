import { Text, View } from 'react-native';
import type { WeekProgress as Progress } from '../../domain/weeklyGoals';
import { summaryPeriodLabel } from '../../domain/workoutSummary';
import { fonts, type AppTheme } from '../../ui/theme';

export function WeekProgress({ week, theme }: { week: Progress; theme: AppTheme }) {
  const status = { achieved: 'Goal met', in_progress: 'In progress', missed: 'Below target', future: 'Upcoming', not_started: 'No recorded activity' }[week.status];
  return <View style={{ gap: 8 }}>
    <Text style={{ color: theme.muted }}>{summaryPeriodLabel('week', week.start)}</Text>
    <Text style={{ color: theme.text, fontFamily: fonts.bold, fontSize: 20 }}>{week.activeDays} / {week.targetDays} active days</Text>
    <View accessibilityRole="progressbar" accessibilityLabel="Weekly active days" accessibilityValue={{ min: 0, max: week.targetDays, now: Math.min(week.activeDays, week.targetDays), text: `${week.activeDays} of ${week.targetDays} active days` }} style={{ height: 8, borderRadius: 4, backgroundColor: theme.soft }}>
      <View style={{ height: 8, borderRadius: 4, width: `${Math.min(1, week.activeDays / week.targetDays) * 100}%`, backgroundColor: theme.success }} />
    </View>
    <Text style={{ color: week.status === 'achieved' ? theme.success : theme.muted }}>{status}</Text>
  </View>;
}
