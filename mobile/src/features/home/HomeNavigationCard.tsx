import { Pressable, Text, View } from 'react-native';
import { fonts, type AppTheme } from '../../ui/theme';

export function HomeNavigationCard({ theme, kind, onPress }: { theme: AppTheme; kind: 'summary' | 'progress'; onPress: () => void }) {
  const summary = kind === 'summary';
  const color = summary ? theme.info : theme.success;
  const title = summary ? 'Workout summaries' : 'Exercise progress';
  const description = summary ? 'Weekly, monthly and yearly totals' : 'Loads, reps and equipment history';
  return <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityHint={description} onPress={onPress}
    style={({ pressed }) => ({ minHeight: 80, padding: 14, borderRadius: 16, borderWidth: 1, borderColor: summary ? theme.infoBorder : theme.successBorder, backgroundColor: summary ? theme.infoSoft : theme.successSoft, flexDirection: 'row', alignItems: 'center', gap: 12, opacity: pressed ? 0.75 : 1 })}>
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}>
      {summary ? <View style={{ height: 26, flexDirection: 'row', alignItems: 'flex-end', gap: 4 }}>{[10, 18, 26].map(height => <View key={height} style={{ height, width: 5, borderRadius: 2, backgroundColor: color }} />)}</View> : <Text style={{ color, fontSize: 30 }}>↗</Text>}
    </View>
    <View style={{ flex: 1, gap: 4 }}>
      <Text style={{ color, fontFamily: fonts.bold, fontSize: 16 }}>{title}</Text>
      <Text style={{ color: theme.muted, fontFamily: fonts.medium, fontSize: 12, lineHeight: 18 }}>{description}</Text>
    </View>
    <Text accessible={false} style={{ color, fontSize: 26 }}>›</Text>
  </Pressable>;
}
