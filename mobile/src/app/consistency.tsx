import { router } from 'expo-router';
import { useState } from 'react';
import { Text, View, useColorScheme } from 'react-native';
import { localDate } from '../domain/workout';
import { shiftSummaryPeriod, summaryPeriodLabel } from '../domain/workoutSummary';
import { GoalDialog } from '../features/consistency/GoalDialog';
import { WeekProgress } from '../features/consistency/WeekProgress';
import { useWeeklyConsistency } from '../features/consistency/useWeeklyConsistency';
import { openStore } from '../storage/openStore';
import { Button, Screen, styles } from '../ui/controls';
import { getTheme, fonts } from '../ui/theme';

export default function ConsistencyRoute() {
  const theme = getTheme(useColorScheme()), today = localDate(new Date());
  const { data, error, retry } = useWeeklyConsistency(today);
  const [editing, setEditing] = useState(false);
  const next = shiftSummaryPeriod('week', today, 1);
  const card = [styles.card, { backgroundColor: theme.surface, borderColor: theme.border }];
  return <Screen theme={theme}>
    <Button theme={theme} variant="link" label="Back to Home" onPress={() => { if (router.canGoBack()) router.back(); else router.replace('/'); }} />
    <Text accessibilityRole="header" style={[styles.heading, { color: theme.text }]}>Goals and streaks</Text>
    <Text style={{ color: theme.muted }}>Your week, your pace. Gym and home workouts both count.</Text>
    {!!error && <><Text accessibilityRole="alert" style={{ color: theme.danger }}>{error}</Text><Button theme={theme} label="Retry progress" onPress={retry} /></>}
    {!data && !error && <Text style={{ color: theme.muted }}>Loading progress...</Text>}
    {data && <>
      <View style={card}><WeekProgress week={data.currentWeek} theme={theme} />
        <Text style={{ color: theme.muted }}>One active day counts once, even with multiple workouts. Any workout split counts toward your target.</Text>
        {data.pendingGoal && <Text style={{ color: theme.accent }}>Scheduled: {data.pendingGoal.targetDays} days, starting the week of {summaryPeriodLabel('week', data.pendingGoal.effectiveWeekStart)}.</Text>}
        <Button theme={theme} label="Change weekly target" onPress={() => setEditing(true)} disabled={!next} />
      </View>
      <View style={card}>
        <Text style={{ color: theme.text, fontFamily: fonts.bold, fontSize: 22 }}>Current streak: {data.currentStreak} {data.currentStreak === 1 ? 'week' : 'weeks'}</Text>
        <Text style={{ color: theme.text }}>Longest streak: {data.longestStreak} {data.longestStreak === 1 ? 'week' : 'weeks'}</Text>
        <Text style={{ color: theme.muted }}>Meet your active-day target in consecutive Monday-to-Sunday weeks. An unfinished current week keeps your streak open. A closed week below its target breaks it.</Text>
      </View>
      <Text accessibilityRole="header" style={{ color: theme.text, fontFamily: fonts.bold }}>Recent weeks</Text>
      {data.recentWeeks.map(week => <View key={week.start} style={card}><WeekProgress week={week} theme={theme} /></View>)}
      <Text style={{ color: theme.muted }}>Targets are kept with their effective week. Older workouts use your earliest recorded target. Backdating or removing a workout updates your streaks.</Text>
      {editing && next && <GoalDialog theme={theme} initial={data.pendingGoal?.targetDays ?? data.currentWeek.targetDays} currentTarget={data.currentWeek.targetDays} nextWeekLabel={`next Monday (${next})`} close={() => setEditing(false)} save={async target => { const store = await openStore(); await store.scheduleWeeklyGoal(target, today); retry(); }} />}
    </>}
  </Screen>;
}
