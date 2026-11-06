import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { fonts, type AppTheme } from '../../ui/theme';
import { Button } from '../../ui/controls';
import type { WorkoutListItem } from '../../domain/workout';
import type { LocationFilter } from '../../domain/workoutCalendar';
import { WorkoutCalendar } from './WorkoutCalendar';

export function HomeScreen({ theme, workouts = [], hasDraft = false, onStart, onOpen, onOpenDay, onSummary, onProgress, weeklyProgress, refreshing = false, error = '', onRetry }: {
  theme: AppTheme; workouts?: WorkoutListItem[]; hasDraft?: boolean;
  onStart?: () => void; onOpen?: (id: string) => void;
  onOpenDay?: (date: string, filter: LocationFilter) => void; refreshing?: boolean; error?: string; onRetry?: () => void;
  onSummary?: () => void; onProgress?: () => void; weeklyProgress?: ReactNode;
}) {
  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.background }]}
      testID="home-screen"
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.eyebrow, { color: theme.muted }]}>WORKOUT JOURNAL</Text>
        <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>
          Today
        </Text>
        <Text style={[styles.body, { color: theme.muted }]}>
          A little progress, at your pace.
        </Text>

        {onStart && <Button theme={theme} primary label={hasDraft ? 'Resume workout' : 'Start workout'} onPress={onStart} />}
        {onSummary && <Button theme={theme} variant="link" label="Workout summaries" onPress={onSummary} />}
        {onProgress && <Button theme={theme} variant="link" label="Exercise progress" onPress={onProgress} />}
        {weeklyProgress}
        {refreshing && <Text style={{ color: theme.muted }}>Updating history…</Text>}
        {!!error && <><Text accessibilityRole="alert" style={{ color: theme.danger }}>{error} Showing the last loaded view.</Text>{onRetry && <Button theme={theme} label="Retry history" onPress={onRetry} />}</>}
        {!workouts.length && !error && <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={[styles.badge, { backgroundColor: theme.accentSoft }]}>
            <Text style={[styles.badgeLabel, { color: theme.accent }]}>A FRESH START</Text>
          </View>
          <Text accessibilityRole="header" style={[styles.cardTitle, { color: theme.text }]}>
            No workouts yet
          </Text>
          <Text style={[styles.body, { color: theme.muted }]}>
            Your completed workouts will appear here.
          </Text>
        </View>}
        <WorkoutCalendar workouts={workouts} theme={theme} openDay={onOpenDay} openWorkout={onOpen} disabled={refreshing || Boolean(error)} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { padding: 24, paddingTop: 40, gap: 12, width: '100%', maxWidth: 640, alignSelf: 'center' },
  eyebrow: { fontFamily: fonts.bold, fontSize: 12, letterSpacing: 1.44 },
  title: { fontFamily: fonts.bold, fontSize: 30, letterSpacing: -0.6 },
  body: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 22 },
  card: {
    marginTop: 12,
    padding: 20,
    borderRadius: 20,
    gap: 12,
    borderWidth: 1,
  },
  badge: { alignSelf: 'flex-start', borderRadius: 9999, paddingHorizontal: 12, paddingVertical: 8 },
  badgeLabel: { fontFamily: fonts.bold, fontSize: 10, letterSpacing: 1.2 },
  cardTitle: { fontFamily: fonts.bold, fontSize: 20, letterSpacing: -0.2 },
});
