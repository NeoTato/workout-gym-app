import { Pressable, Text, View } from 'react-native';
import { activityDateValue } from '../../domain/workoutCalendar';
import type { WeekProgress } from '../../domain/weeklyGoals';
import { localDate } from '../../domain/workout';
import { fonts, type AppTheme } from '../../ui/theme';
import { styles } from '../../ui/controls';

export function WeeklyPreview({ week, streak, dates, theme, open }: { week: WeekProgress; streak: number; dates: string[]; theme: AppTheme; open: () => void }) {
  const activity = new Set(dates), today = localDate(new Date());
  return <Pressable testID="weekly-preview" accessibilityRole="button" accessibilityLabel={'Goals and streaks, ' + week.activeDays + ' of ' + week.targetDays + ' active days this week, ' + streak + '-week streak'} onPress={open}
    style={({ pressed }) => [styles.card, { backgroundColor: theme.surface, borderColor: theme.border, opacity: pressed ? 0.8 : 1 }]}>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
      <Text style={{ color: theme.text, fontFamily: fonts.bold }}>This week</Text>
      <Text style={{ color: theme.success, backgroundColor: theme.successSoft, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, fontSize: 12 }}>{week.activeDays} of {week.targetDays} days</Text>
    </View>
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 4 }}>
      {['M','T','W','T','F','S','S'].map((label, index) => {
        const day = activityDateValue(week.start); day.setUTCDate(day.getUTCDate() + index); const date = day.toISOString().slice(0,10), active = date <= today && activity.has(date);
        return <View key={date} style={{ alignItems: 'center', gap: 8, flex: 1 }}><Text style={{ color: theme.muted, fontSize: 10 }}>{label}</Text>
          <View style={{ width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: active ? theme.success : theme.soft, borderWidth: date === today ? 1 : 0, borderColor: theme.accent }}>
            {active && <Text style={{ color: theme.surface, fontSize: 13 }}>✓</Text>}
          </View>
        </View>;
      })}
    </View>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
      <Text style={{ color: theme.muted, fontSize: 12 }}>{streak ? streak + '-week streak' : 'Start your streak'}</Text><Text style={{ color: theme.info, fontSize: 12 }}>Goals & streaks ›</Text>
    </View>
  </Pressable>;
}
