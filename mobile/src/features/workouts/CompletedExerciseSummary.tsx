import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { formatCompletedSet, type CompletedExercise } from '../../domain/workout';
import { Button, styles } from '../../ui/controls';
import { fonts, type AppTheme } from '../../ui/theme';

export function CompletedExerciseSummary({ exercise, theme, onProgress }: { exercise: CompletedExercise; theme: AppTheme; onProgress?: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const count = `${exercise.sets.length} ${exercise.sets.length === 1 ? 'set' : 'sets'}`;
  const classification = [exercise.category, exercise.subcategory].filter(Boolean).join(' · ');
  return <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
    <Pressable accessibilityRole="button" accessibilityLabel={[exercise.name, classification, count].filter(Boolean).join(', ')} accessibilityState={{ expanded }}
      accessibilityHint={expanded ? 'Hide completed sets' : 'Show completed sets'} onPress={() => setExpanded(value => !value)}
      style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={{ color: theme.text, fontFamily: fonts.bold, fontSize: 18 }}>{exercise.name}</Text>
        <Text style={{ color: theme.muted, fontSize: 12 }}>{[classification, count].filter(Boolean).join(' · ')}</Text>
      </View>
      <Text accessible={false} style={{ color: theme.muted, fontSize: 20 }}>{expanded ? '−' : '+'}</Text>
    </Pressable>
    {expanded && <>
      {!!exercise.equipment && <Text style={{ color: theme.muted }}>{exercise.equipment}</Text>}
      {!exercise.bodyweight && !exercise.tracking && <Text style={{ color: theme.muted }}>{exercise.unit === 'lb' ? 'lbs' : exercise.unit} · {exercise.convention.replace('_', ' ')}</Text>}
      {exercise.sets.map((set, index) => <Text key={set.id} style={[styles.subtitle, { color: theme.text }]}>
        Set {index + 1}: {formatCompletedSet(exercise, set)}
      </Text>)}
      {onProgress && <Button theme={theme} variant="info" label="View exercise progress" onPress={onProgress} />}
    </>}
  </View>;
}
