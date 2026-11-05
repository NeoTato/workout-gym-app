import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { localDate, type WorkoutListItem } from '../../domain/workout';
import { activityDateValue, calendarDateLabel, calendarMonth, shiftCalendarMonth, workoutsInMonth, type LocationFilter } from '../../domain/workoutCalendar';
import { Button, Choice, styles } from '../../ui/controls';
import { fonts, type AppTheme } from '../../ui/theme';

export function WorkoutCalendar({ workouts, theme, openDay, openWorkout, disabled = false, today = localDate(new Date()) }: {
  workouts: WorkoutListItem[]; theme: AppTheme; openDay?: (date: string, filter: LocationFilter) => void;
  openWorkout?: (id: string) => void; disabled?: boolean; today?: string;
}) {
  const [month, setMonth] = useState(today.slice(0, 7));
  const [filter, setFilter] = useState<LocationFilter>('all');
  const [selected, setSelected] = useState('');
  const items = workoutsInMonth(workouts, month, filter);
  const counts = new Map<string, number>();
  for (const item of items) counts.set(item.activityDate, (counts.get(item.activityDate) ?? 0) + 1);
  const cells = calendarMonth(month), previous = shiftCalendarMonth(month, -1), next = shiftCalendarMonth(month, 1);
  const title = new Intl.DateTimeFormat('en', { timeZone: 'UTC', month: 'long', year: 'numeric' }).format(activityDateValue(`${month}-01`));
  const rows = Array.from({ length: cells.length / 7 }, (_, index) => cells.slice(index * 7, index * 7 + 7));
  return <>
    <View testID="workout-calendar" style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Previous month" accessibilityState={{ disabled: !previous }} disabled={!previous} onPress={() => { if (previous) setMonth(previous); }}
          style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: theme.muted, fontSize: 24 }}>‹</Text></Pressable>
        <Text accessibilityRole="header" accessibilityLiveRegion="polite" style={{ color: theme.text, fontFamily: fonts.bold, fontSize: 18, flex: 1, textAlign: 'center' }}>{title}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Next month" accessibilityState={{ disabled: !next }} disabled={!next} onPress={() => { if (next) setMonth(next); }}
          style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: theme.muted, fontSize: 24 }}>›</Text></Pressable>
      </View>
      <Choice<LocationFilter> theme={theme} label="Show workouts" value={filter} options={[{ value: 'all', label: 'All' }, { value: 'gym', label: 'Gym' }, { value: 'home', label: 'Home' }]} onChange={setFilter} />
      <Text style={{ color: theme.muted, fontSize: 12 }}>{items.length} {items.length === 1 ? 'workout' : 'workouts'} · {counts.size} active {counts.size === 1 ? 'day' : 'days'}</Text>
      <View style={{ flexDirection: 'row', gap: 4 }}>
        {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(day => <Text key={day} style={{ flex: 1, textAlign: 'center', color: theme.muted, fontSize: 11 }}>{day}</Text>)}
      </View>
      <View style={{ gap: 4 }}>
        {rows.map((row, index) => <View key={index} style={{ flexDirection: 'row', gap: 4 }}>
          {row.map((date, column) => date ? <Pressable key={date} accessibilityRole="button" disabled={disabled || !openDay}
            accessibilityLabel={`${calendarDateLabel(date)}${date === today ? ', today' : ''}, ${counts.get(date) ?? 0} completed ${(counts.get(date) ?? 0) === 1 ? 'workout' : 'workouts'}`}
            accessibilityState={{ selected: selected === date, disabled: disabled || !openDay }}
            onPress={() => { setSelected(date); openDay?.(date, filter); }} style={{ flex: 1, minHeight: 48, borderRadius: 10, borderWidth: 1,
              borderColor: selected === date || date === today ? theme.primary : 'transparent', backgroundColor: selected === date ? theme.accentSoft : counts.has(date) ? theme.successSoft : theme.background,
              alignItems: 'center', justifyContent: 'center', paddingVertical: 4, opacity: disabled ? 0.6 : 1 }}>
            <Text style={{ color: theme.text, fontFamily: fonts.medium, fontSize: 14 }}>{Number(date.slice(-2))}</Text>
            <Text accessible={false} style={{ color: theme.success, fontSize: 10 }}>{counts.has(date) ? `${counts.get(date)}×` : ' '}</Text>
          </Pressable> : <View key={`blank-${column}`} style={{ flex: 1 }} />)}
        </View>)}
      </View>
      <Text style={{ color: theme.muted, fontSize: 12 }}>Counts mark completed workouts. Tap a date for details.</Text>
      {month !== today.slice(0, 7) && <Button theme={theme} variant="link" label="Back to this month" onPress={() => setMonth(today.slice(0, 7))} />}
    </View>
    <Text accessibilityRole="header" style={{ color: theme.text, fontFamily: fonts.bold, fontSize: 18, marginTop: 12 }}>Workouts in {title}</Text>
    {!disabled && !items.length && <Text style={{ color: theme.muted }}>No completed workouts in this month{filter === 'all' ? '.' : ` for ${filter === 'home' ? 'Home' : 'gyms'}.`}</Text>}
    {items.slice(0, 5).map(workout => <Pressable key={workout.id} accessibilityRole="button" accessibilityLabel={`Open ${workout.sessionType} workout on ${workout.activityDate}`} disabled={disabled || !openWorkout}
      onPress={() => openWorkout?.(workout.id)} style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Text style={{ color: theme.text, fontFamily: fonts.bold, fontSize: 18 }}>{workout.sessionType}</Text>
      <Text style={{ color: theme.muted }}>{workout.activityDate} · {workout.locationName}</Text>
      <Text style={{ color: theme.muted, fontSize: 12 }}>View completed sets →</Text>
    </Pressable>)}
    {items.length > 5 && <Text style={{ color: theme.muted }}>Showing the latest 5. Select a date to see all its workouts.</Text>}
  </>;
}
