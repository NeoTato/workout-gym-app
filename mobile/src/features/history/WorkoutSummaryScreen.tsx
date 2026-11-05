import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { WeekProgress } from '../consistency/WeekProgress';
import { formatRecordedTime, periodBounds, shiftSummaryPeriod, summaryPeriodLabel, type PeriodSummary, type SummaryPeriod } from '../../domain/workoutSummary';
import { Button, Choice, Screen, styles } from '../../ui/controls';
import { fonts, type AppTheme } from '../../ui/theme';

export function WorkoutSummaryScreen({ kind, anchor, today, data, error, retry, back, changeKind, changeAnchor, theme }: {
  kind: SummaryPeriod; anchor: string; today: string; data: PeriodSummary | null; error: string;
  retry: () => void; back: () => void; changeKind: (kind: SummaryPeriod) => void; changeAnchor: (date: string) => void; theme: AppTheme;
}) {
  const previous = shiftSummaryPeriod(kind, anchor, -1), next = shiftSummaryPeriod(kind, anchor, 1);
  const [expandedWeeks, setExpandedWeeks] = useState('');
  const periodKey = `${kind}:${anchor}`;
  const current = periodBounds(kind, anchor).start === periodBounds(kind, today).start;
  const card = [styles.card, { backgroundColor: theme.surface, borderColor: theme.border }];
  const maxDays = Math.max(1, ...(data?.activity.map(item => item.activeDays) ?? []));
  const row = (name: string, count: number) => <View key={name} accessible accessibilityLabel={`${name}, ${count} ${count === 1 ? 'workout' : 'workouts'}`} style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
    <Text style={{ flex: 1, color: theme.text }}>{name}</Text><Text style={{ color: theme.text, fontFamily: fonts.bold }}>{count}</Text>
  </View>;
  return <Screen theme={theme}>
    <Button theme={theme} variant="link" label="Back to calendar" onPress={back} />
    <Text accessibilityRole="header" style={[styles.heading, { color: theme.text }]}>Workout summary</Text>
    <Text style={{ color: theme.muted }}>All locations · completed workouts</Text>
    <Choice<SummaryPeriod> theme={theme} label="Summary period" value={kind} options={[{ value: 'week', label: 'Week' }, { value: 'month', label: 'Month' }, { value: 'year', label: 'Year' }]} onChange={changeKind} />
    <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Previous period" accessibilityState={{ disabled: !previous }} disabled={!previous} onPress={() => { if (previous) changeAnchor(previous); }} style={{ minWidth: 44, minHeight: 44, justifyContent: 'center', alignItems: 'center' }}><Text style={{ color: theme.muted, fontSize: 24 }}>‹</Text></Pressable>
      <Text accessibilityRole="header" accessibilityLiveRegion="polite" style={{ flex: 1, color: theme.text, textAlign: 'center', fontFamily: fonts.bold, fontSize: 18 }}>{summaryPeriodLabel(kind, anchor)}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Next period" accessibilityState={{ disabled: !next }} disabled={!next} onPress={() => { if (next) changeAnchor(next); }} style={{ minWidth: 44, minHeight: 44, justifyContent: 'center', alignItems: 'center' }}><Text style={{ color: theme.muted, fontSize: 24 }}>›</Text></Pressable>
    </View>
    {!current && <Button theme={theme} variant="link" label={`Back to this ${kind}`} onPress={() => changeAnchor(today)} />}
    {!!error && <><Text accessibilityRole="alert" style={{ color: theme.danger }}>{error}</Text><Button theme={theme} label="Retry summary" onPress={retry} /></>}
    {!error && !data && <Text style={{ color: theme.muted }}>Loading summary…</Text>}
    {!error && data && <>
      <Text style={{ color: theme.muted }}>{data.status === 'current' ? 'So far' : data.status === 'future' ? 'Future period · no completed results' : 'Past period'}</Text>
      <View style={card}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 20 }}>
          <View style={{ flex: 1, minWidth: 100, gap: 4 }}><Text style={{ color: theme.muted }}>Workouts</Text><Text accessibilityLabel={`${data.sessions} ${data.sessions === 1 ? 'workout' : 'workouts'}`} style={{ color: theme.text, fontFamily: fonts.bold, fontSize: 30 }}>{data.sessions}</Text></View>
          <View style={{ flex: 1, minWidth: 100, gap: 4 }}><Text style={{ color: theme.muted }}>Active days</Text><Text accessibilityLabel={`${data.activeDays} active ${data.activeDays === 1 ? 'day' : 'days'}`} style={{ color: theme.text, fontFamily: fonts.bold, fontSize: 30 }}>{data.activeDays}</Text></View>
        </View>
        <Text style={{ color: theme.muted }}>Recorded time</Text><Text style={{ color: theme.text, fontFamily: fonts.bold, fontSize: 22 }}>{formatRecordedTime(data.recordedSeconds)}</Text>
        <Text style={{ color: theme.muted, fontSize: 12 }}>Based on saved session start and end times.</Text>
        {data.missingDurationSessions > 0 && <Text style={{ color: theme.muted }}>{data.missingDurationSessions} {data.missingDurationSessions === 1 ? 'workout' : 'workouts'} without duration</Text>}
        {data.sessions === 0 && data.status !== 'future' && <Text style={{ color: theme.muted }}>No completed workouts in this period.</Text>}
      </View>
      <View style={card}>
        <Text accessibilityRole="header" style={{ color: theme.text, fontFamily: fonts.bold }}>Activity by {kind === 'week' ? 'day' : kind === 'month' ? 'week' : 'month'}</Text>
        {data.activity.map(item => <View key={item.start} accessible accessibilityLabel={`${item.label}: ${item.activeDays} active ${item.activeDays === 1 ? 'day' : 'days'}, ${item.sessions} ${item.sessions === 1 ? 'workout' : 'workouts'}`} style={{ gap: 6 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 6 }}><Text style={{ color: theme.text }}>{item.label}</Text><Text style={{ color: theme.muted, fontSize: 12 }}>{item.activeDays} {item.activeDays === 1 ? 'day' : 'days'} · {item.sessions} {item.sessions === 1 ? 'workout' : 'workouts'}</Text></View>
          <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ height: 8, borderRadius: 4, backgroundColor: theme.soft }}><View style={{ width: `${item.activeDays / maxDays * 100}%`, height: 8, borderRadius: 4, backgroundColor: theme.success }} /></View>
        </View>)}
      </View>
      {data.consistency && <View style={card}>
        <Text accessibilityRole="header" style={{ color: theme.text, fontFamily: fonts.bold }}>Weekly consistency</Text>
        {kind === 'week' ? <WeekProgress week={data.consistency.weeks[0]} theme={theme} /> : <>
          <Text style={{ color: theme.text }}>{data.consistency.achievedWeeks} weekly {data.consistency.achievedWeeks === 1 ? 'goal' : 'goals'} met</Text>
          {kind === 'year' && <Text style={{ color: theme.text }}>Longest streak in this year: {data.consistency.longestStreak} {data.consistency.longestStreak === 1 ? 'week' : 'weeks'}</Text>}
          <Text style={{ color: theme.muted }}>Counts complete Monday-to-Sunday weeks touching this {kind}, including adjoining dates. Activity totals above count only dates within this {kind}.</Text>
          {kind === 'month' && <><Button theme={theme} variant="link" label={expandedWeeks === periodKey ? 'Hide weekly goals' : 'Show weekly goals'} onPress={() => setExpandedWeeks(expandedWeeks === periodKey ? '' : periodKey)} />
            {expandedWeeks === periodKey && data.consistency.weeks.map(week => <WeekProgress key={week.start} week={week} theme={theme} />)}</>}
        </>}
      </View>}
      <View style={card}><Text accessibilityRole="header" style={{ color: theme.text, fontFamily: fonts.bold }}>Workout types</Text>{data.typeCounts.filter(item => item.count > 0 || ['Push', 'Pull', 'Legs'].includes(item.name)).map(item => row(item.name, item.count))}</View>
      <View style={card}><Text accessibilityRole="header" style={{ color: theme.text, fontFamily: fonts.bold }}>Locations</Text>{row('Gym', data.locationCounts.gym)}{row('Home', data.locationCounts.home)}</View>
      <View style={card}><Text accessibilityRole="header" style={{ color: theme.text, fontFamily: fonts.bold }}>Exercise groups</Text>
        <Text style={{ color: theme.muted, fontSize: 12 }}>Uses current exercise categories. Each group counts once per workout; groups can overlap.</Text>
        {data.exerciseGroups.length ? data.exerciseGroups.map(item => row(item.name, item.count)) : <Text style={{ color: theme.muted }}>No completed exercise groups in this period.</Text>}
      </View>
    </>}
  </Screen>;
}
