import { Pressable, ScrollView, Text, View } from 'react-native';
import { formatProgressValue, type progressMetrics } from '../../domain/exerciseProgress';
import type { AppTheme } from '../../ui/theme';

export function ProgressChart({ metrics, theme, openWorkout }: { metrics: ReturnType<typeof progressMetrics>; theme: AppTheme; openWorkout: (id: string) => void }) {
  const max = Math.max(1, ...metrics.points.map(point => point.value));
  return <View style={{ gap: 8 }}>
    <Text style={{ color: theme.muted, fontSize: 12 }}>Latest {metrics.points.length} / oldest to newest</Text>
    <Text style={{ color: theme.muted, fontSize: 12 }}>Tap a bar to open its workout.</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={{ gap: 8, paddingVertical: 8 }}>
      {metrics.points.map(point => <Pressable key={point.workoutId} accessibilityRole="button" accessibilityLabel={`${point.date}: ${formatProgressValue(point.value)} ${metrics.unit}. Open workout`} onPress={() => openWorkout(point.workoutId)} style={{ width: 72, minHeight: 180, alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
        <Text style={{ color: theme.text, fontSize: 12 }}>{formatProgressValue(point.value)}</Text>
        <View style={{ height: 110, width: 48, justifyContent: 'flex-end', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: theme.border }}>
          <View style={{ width: 28, height: point.value / max * 110, backgroundColor: theme.primary, borderTopLeftRadius: 5, borderTopRightRadius: 5 }} />
        </View>
        <Text style={{ color: theme.muted, fontSize: 12 }}>{point.date.slice(5)}</Text>
      </Pressable>)}
    </ScrollView>
  </View>;
}
