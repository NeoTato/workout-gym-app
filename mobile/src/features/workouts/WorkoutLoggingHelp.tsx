import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { fonts, type AppTheme } from '../../ui/theme';

export function WorkoutLoggingHelp({ theme, editing = false }: { theme: AppTheme; editing?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  return <View style={{ gap: 12 }}>
    <Pressable accessibilityRole="button" accessibilityLabel="How logging works" accessibilityState={{ expanded }} onPress={() => setExpanded(value => !value)} style={{ minHeight: 44, padding: 12, borderRadius: 12, backgroundColor: theme.infoSoft, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <Text style={{ flex: 1, color: theme.info, fontFamily: fonts.medium }}>How logging works</Text><Text accessible={false} style={{ color: theme.info }}>{expanded ? '−' : '+'}</Text>
    </Pressable>
    {expanded && <>
      <Text style={{ color: theme.muted, fontSize: 12, lineHeight: 18 }}>Valid load and reps mark a set done automatically. Bodyweight sets need reps only. Copied sets stay incomplete until edited or marked done.</Text>
      <Text style={{ color: theme.muted, fontSize: 12, lineHeight: 18 }}>Choose Duration or Distance + duration in exercise Setup for holds and cardio. Enter whole seconds and kilometres. Changing tracking clears the set inputs; choose it before logging.</Text>
      <Text style={{ color: theme.muted, fontSize: 12, lineHeight: 18 }}>{editing ? 'Complete or remove every set before saving changes.' : 'Only completed sets are saved when you finish. There is no required exercise or set count.'}</Text>
    </>}
  </View>;
}
