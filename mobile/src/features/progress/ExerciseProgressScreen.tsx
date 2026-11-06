import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { formatProgressValue, progressMetrics, type ProgressSession, type ProgressVariation } from '../../domain/exerciseProgress';
import { Button, Screen, styles } from '../../ui/controls';
import { fonts, type AppTheme } from '../../ui/theme';
import { ProgressChart } from './ProgressChart';

function SessionCard({ session, bodyweight, theme, openWorkout }: { session: ProgressSession; bodyweight: boolean; theme: AppTheme; openWorkout: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  return <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
    <Pressable accessibilityRole="button" accessibilityLabel={`${session.activityDate}, ${session.sessionType}, ${session.sets.length} ${session.sets.length === 1 ? 'set' : 'sets'}`} accessibilityState={{ expanded }} onPress={() => setExpanded(value => !value)} style={{ minHeight: 48, justifyContent: 'center', gap: 6 }}>
      <Text style={{ color: theme.text, fontFamily: fonts.bold }}>{session.activityDate} / {session.sessionType}</Text>
      <Text style={{ color: theme.muted }}>{session.sets.length} {session.sets.length === 1 ? 'set' : 'sets'} / {expanded ? 'Hide sets' : 'Show sets'}</Text>
    </Pressable>
    {expanded && <>{session.sets.map((set, index) => <Text key={set.id} style={{ color: theme.text }}>Set {index + 1}: {bodyweight ? 'Bodyweight' : `${set.weight} ${set.unit}`} × {set.reps} reps</Text>)}<Button theme={theme} variant="link" label="Open workout" onPress={() => openWorkout(session.workoutId)} /></>}
  </View>;
}

export function ExerciseProgressScreen({ name, variations, theme, back, openWorkout, initialVariationId = '', refreshing = false }: { name: string; variations: ProgressVariation[]; theme: AppTheme; back: () => void; openWorkout: (id: string) => void; initialVariationId?: string; refreshing?: boolean }) {
  const [selection, setSelection] = useState(initialVariationId), [choosing, setChoosing] = useState(false);
  const [unit, setUnit] = useState<'lb' | 'kg'>(() => (variations.find(item => item.variationId === initialVariationId) ?? variations[0])?.sessions[0]?.sets[0]?.unit === 'kg' ? 'kg' : 'lb');
  const [history, setHistory] = useState({ id: '', count: 10 });
  const variation = variations.find(item => item.variationId === selection) ?? variations[0];
  const card = [styles.card, { backgroundColor: theme.surface, borderColor: theme.border }];
  const count = history.id === variation?.variationId ? history.count : 10;
  const description = (item: ProgressVariation) => `${item.locationName} / ${item.equipment} / ${item.bodyweight ? 'bodyweight reps' : `${item.dimension === 'mass' ? 'lb / kg' : 'plates'}, ${item.convention.replaceAll('_', ' ')}`}${item.archived ? ' / removed location' : ''}`;
  const metrics = variation ? progressMetrics(variation, unit) : null;
  return <Screen theme={theme}>
    <Button theme={theme} variant="link" label="Back" onPress={back} />
    <Text accessibilityRole="header" style={[styles.heading, { color: theme.text }]}>{name}</Text>
    <Text style={{ color: theme.muted }}>Exercise history and progress</Text>
    {refreshing && <Text accessibilityLiveRegion="polite" style={{ color: theme.muted }}>Updating exercise history...</Text>}
    {!variation && <Text style={{ color: theme.muted }}>No completed sets remain for this exercise.</Text>}
    {variation && metrics && <>
      <View style={card}>
        <Text accessibilityRole="header" style={{ color: theme.text, fontFamily: fonts.bold }}>Comparing this equipment</Text>
        <Text style={{ color: theme.text }}>{description(variation)}</Text>
        <Text style={{ color: theme.muted, fontSize: 12 }}>Other gyms, machines, load conventions, plate counts and bodyweight modes stay separate.</Text>
        {variations.length > 1 && <Button theme={theme} label={choosing ? 'Hide equipment options' : 'Change equipment'} onPress={() => setChoosing(value => !value)} />}
        {choosing && variations.map(item => <Pressable key={item.variationId} accessibilityRole="button" accessibilityLabel={`Compare ${description(item)}`} accessibilityState={{ selected: item.variationId === variation.variationId }} onPress={() => { setSelection(item.variationId); setChoosing(false); }} style={{ padding: 12, minHeight: 48, borderRadius: 12, backgroundColor: item.variationId === variation.variationId ? theme.accentSoft : theme.soft }}><Text style={{ color: theme.text }}>{description(item)}</Text></Pressable>)}
        {variation.dimension === 'mass' && <View style={{ gap: 8 }}>
          <Text style={{ color: theme.muted }}>Chart unit</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>{(['lb', 'kg'] as const).map(value => <Pressable key={value} accessibilityRole="button" accessibilityLabel={`Chart unit: ${value}`} accessibilityState={{ selected: unit === value }} aria-pressed={unit === value} onPress={() => setUnit(value)} style={{ minWidth: 64, minHeight: 48, borderRadius: 10, borderWidth: 1, borderColor: unit === value ? theme.primary : 'transparent', backgroundColor: unit === value ? theme.accentSoft : theme.soft, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: unit === value ? theme.accent : theme.muted }}>{value}</Text></Pressable>)}</View>
        </View>}
      </View>
      <View style={card}>
        <Text accessibilityRole="header" style={{ color: theme.text, fontFamily: fonts.bold }}>{variation.bodyweight ? 'Highest reps per set' : 'Heaviest completed load'}</Text>
        <Text style={{ color: theme.success, fontFamily: fonts.bold, fontSize: 28 }}>{metrics.best === null ? 'No record' : `${formatProgressValue(metrics.best)} ${metrics.unit}`}</Text>
        <Text style={{ color: theme.muted }}>Best across {variation.sessions.length} saved {variation.sessions.length === 1 ? 'session' : 'sessions'} on this equipment. {variation.bodyweight ? 'Reps are shown per set.' : 'Loads are compared regardless of reps; this is not a strength score.'}</Text>
        <ProgressChart metrics={metrics} theme={theme} openWorkout={openWorkout} />
        {variation.dimension === 'mass' && <Text style={{ color: theme.muted, fontSize: 12 }}>Chart values convert lb/kg and round to two decimals. Sets below keep their original units and {variation.convention.replaceAll('_', ' ')} convention.</Text>}
      </View>
      <Text accessibilityRole="header" style={{ color: theme.text, fontFamily: fonts.bold }}>Session history / newest first</Text>
      {variation.sessions.slice(0, count).map(session => <SessionCard key={`${variation.variationId}:${session.workoutId}`} session={session} bodyweight={variation.bodyweight} theme={theme} openWorkout={openWorkout} />)}
      {count < variation.sessions.length && <Button theme={theme} label="Show 10 more sessions" onPress={() => setHistory({ id: variation.variationId, count: count + 10 })} />}
    </>}
  </Screen>;
}
