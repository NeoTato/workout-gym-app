import { useState } from 'react';
import { formatCompletedSet } from '../../domain/workout';
import { Text, View } from 'react-native';
import type { ReferenceContext, ReferenceExercise } from '../../domain/workoutReferences';
import { Button, styles } from '../../ui/controls';
import { fonts, type AppTheme } from '../../ui/theme';
import { usePreviousExercise, useRecentSessions } from './useWorkoutReferences';

export function RecentSessions({ context, sessionType, theme, open }: {
  context: ReferenceContext | null; sessionType: string; theme: AppTheme; open: (id: string) => void;
}) {
  const reference = useRecentSessions(context, sessionType);
  const [expanded, setExpanded] = useState(false);
  if (!context) return null;
  if (!reference.loading && !reference.error && reference.data?.length === 0) return null;
  return <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
    <Button theme={theme} variant="info" label={`${expanded ? 'Hide recent' : 'Recent'} ${sessionType} here`} onPress={() => setExpanded(value => !value)} />
    {reference.loading && <Text style={{ color: theme.muted }}>Loading previous sessions…</Text>}
    {!!reference.error && <><Text accessibilityRole="alert" style={{ color: theme.danger }}>{reference.error}</Text><Button theme={theme} label="Retry recent sessions" onPress={reference.retry} /></>}
    {expanded && !reference.loading && !reference.error && reference.data?.map(item => <Button key={item.id} theme={theme} variant="info"
      label={`${item.activityDate} · ${item.locationName}`} accessibilityLabel={`View previous ${item.sessionType} workout on ${item.activityDate}`} onPress={() => open(item.id)} />)}
  </View>;
}

export function PreviousExerciseSets({ context, exercise, theme }: { context: ReferenceContext | null; exercise: ReferenceExercise; theme: AppTheme }) {
  const reference = usePreviousExercise(context, exercise);
  const [expanded, setExpanded] = useState(false);
  const previous = reference.data;
  if (!context || !exercise.name.trim()) return null;
  if (!reference.loading && !reference.error && previous === null) return null;
  return <View style={{ gap: 6 }}>
    {reference.loading && <Text style={{ color: theme.muted, fontSize: 12 }}>Loading last time…</Text>}
    {!!reference.error && <><Text accessibilityRole="alert" style={{ color: theme.danger }}>{reference.error}</Text><Button theme={theme} variant="link" label="Retry last time" onPress={reference.retry} /></>}
    {!reference.loading && !reference.error && previous && <>
      <Button theme={theme} variant="info" label={`${expanded ? 'Hide last time' : 'Last time'}: ${previous.activityDate} · ${previous.sessionType}`} onPress={() => setExpanded(value => !value)} />
      {expanded && <View style={{ backgroundColor: theme.soft, padding: 12, borderRadius: 10, gap: 6 }}>
        <Text style={{ color: theme.muted, fontSize: 12 }}>{previous.locationName} · {previous.exercise.equipment} · reference only</Text>
        {previous.exercise.sets.map((set, index) => <Text key={set.id} style={{ color: theme.text, fontFamily: fonts.medium }}>
          {index + 1}. {formatCompletedSet(previous.exercise, set)}
        </Text>)}
      </View>}
    </>}
  </View>;
}
