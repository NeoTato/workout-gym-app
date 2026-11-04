import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { fonts, type AppTheme } from '../../ui/theme';
import { Button } from '../../ui/controls';
import type { SavedWorkout } from '../../domain/workout';

export function HomeScreen({ theme, workouts = [], hasDraft = false, onStart, onOpen }: {
  theme: AppTheme; workouts?: Omit<SavedWorkout, 'exercises'>[]; hasDraft?: boolean;
  onStart?: () => void; onOpen?: (id: string) => void;
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
        {!workouts.length && <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
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
        {workouts.map(workout => <Pressable key={workout.id} accessibilityRole="button" accessibilityLabel={`Open ${workout.sessionType} workout on ${workout.activityDate}`}
          onPress={() => onOpen?.(workout.id)} style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>{workout.sessionType}</Text>
          <Text style={[styles.body, { color: theme.muted }]}>{workout.activityDate} · {workout.locationName}</Text>
          <Text style={[styles.body, { color: theme.muted }]}>View completed sets →</Text>
        </Pressable>)}
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
