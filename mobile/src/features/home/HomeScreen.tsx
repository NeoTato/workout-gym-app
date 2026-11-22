import type { ReactNode } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fonts, type AppTheme } from '../../ui/theme';
import { Button, styles } from '../../ui/controls';
import { activityDateValue } from '../../domain/workoutCalendar';
import { localDate, type SavedWorkout, type WorkoutListItem } from '../../domain/workout';

export function HomeScreen({ theme, workouts = [], latestWorkout, hasDraft = false, onStart, onOpen, onHistory, weeklyProgress, refreshing = false, error = '', onRetry }: {
  theme: AppTheme; workouts?: WorkoutListItem[]; latestWorkout?: SavedWorkout | null; hasDraft?: boolean;
  onStart?: () => void; onOpen?: (id: string) => void; onHistory?: () => void;
  weeklyProgress?: ReactNode; refreshing?: boolean; error?: string; onRetry?: () => void;
}) {
  const latest = workouts[0];
  const details = latestWorkout?.id === latest?.id ? latestWorkout : null;
  const setCount = details?.exercises.reduce((total, exercise) => total + exercise.sets.length, 0) ?? 0;
  const today = localDate(new Date()), yesterday = activityDateValue(today); yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const dateLabel = latest ? latest.activityDate === today ? 'Today' : latest.activityDate === yesterday.toISOString().slice(0,10) ? 'Yesterday' : new Intl.DateTimeFormat('en', { timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric' }).format(activityDateValue(latest.activityDate)) : '';
  return <SafeAreaView testID="home-screen" edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: theme.background }}>
    <ScrollView contentContainerStyle={[styles.page, { paddingTop: 24, gap: 16 }]}>
      <Text style={{ color: theme.muted, fontFamily: fonts.bold, fontSize: 11, letterSpacing: 1.2 }}>WORKOUT JOURNAL</Text>
      <Text accessibilityRole="header" style={[styles.heading, { color: theme.text }]}>Your training</Text>
      <Text style={[styles.subtitle, { color: theme.muted }]}>A little stronger, one session at a time.</Text>
      {weeklyProgress}
      {hasDraft && onStart && <View testID="resume-workout-card" style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.accent }]}>
        <Text style={{ color: theme.accent, fontFamily: fonts.bold, fontSize: 12 }}>IN PROGRESS</Text>
        <Text style={{ color: theme.text }}>Your unfinished workout is ready when you are.</Text>
        <Button theme={theme} variant="info" label="Resume workout" onPress={onStart} />
      </View>}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <Text accessibilityRole="header" style={{ color: theme.text, fontFamily: fonts.bold, fontSize: 18 }}>Latest workout</Text>
        {onHistory && <Button theme={theme} variant="link" label="View history" onPress={onHistory} />}
      </View>
      {refreshing && <Text style={{ color: theme.muted }}>Updating history...</Text>}
      {!!error && <><Text accessibilityRole="alert" style={{ color: theme.danger }}>{error} Showing the last loaded view.</Text>{onRetry && <Button theme={theme} label="Retry history" onPress={onRetry} />}</>}
      {latest && <Pressable testID="latest-workout-card" accessibilityRole="button" accessibilityLabel={'View latest workout, ' + latest.sessionType + ', ' + dateLabel + ', ' + latest.locationName} disabled={!onOpen || refreshing || Boolean(error)} onPress={() => onOpen?.(latest.id)}
        style={({ pressed }) => [styles.card, { backgroundColor: theme.surface, borderColor: theme.border, opacity: pressed ? 0.8 : 1 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <Text style={{ color: theme.info, backgroundColor: theme.infoSoft, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, fontSize: 12 }}>{latest.locationKind === 'home' ? 'Home' : 'Gym'}</Text>
          <Text style={{ color: theme.muted, fontSize: 12 }}>{dateLabel}</Text>
        </View>
        <Text style={{ color: theme.text, fontFamily: fonts.bold, fontSize: 22 }}>{latest.sessionType} {latest.recordOnly ? 'visit' : 'workout'}</Text>
        <Text style={{ color: theme.muted }}>{latest.locationName}</Text>
        {latest.recordOnly ? <Text style={{ color: theme.muted, fontSize: 12 }}>Workout-only entry</Text> : details && <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 24 }}>
          <Text style={{ color: theme.text }}>{details.exercises.length} {details.exercises.length === 1 ? 'exercise' : 'exercises'}</Text>
          <Text style={{ color: theme.text }}>{setCount} {setCount === 1 ? 'set' : 'sets'}</Text>
        </View>}
        <View style={{ borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 12, flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: theme.info, fontFamily: fonts.medium }}>View workout</Text><Text accessible={false} style={{ color: theme.info }}>›</Text></View>
      </Pressable>}
      {!latest && !error && <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text accessibilityRole="header" style={{ color: theme.text, fontFamily: fonts.bold, fontSize: 20 }}>No workouts yet</Text>
        <Text style={{ color: theme.muted }}>Your latest completed workout will appear here. Use the + Workout button below to begin.</Text>
      </View>}
    </ScrollView>
  </SafeAreaView>;
}
