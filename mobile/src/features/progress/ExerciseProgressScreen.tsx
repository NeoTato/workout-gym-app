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
    {expanded && <>{session.sets.map((set, index) => <Text key={set.id} style={{ color: theme.text }}>Set {index + 1}: {bodyweight ? 'Bodyweight' : `${set.weight} ${set.unit}`} × {set.reps} reps</Text>)}<Button theme={theme} variant="info" label="Open workout" onPress={() => openWorkout(session.workoutId)} /></>}
  </View>;
}

export function ExerciseProgressScreen({ name, variations, theme, back, openWorkout, initialVariationId = '', refreshing = false }: { name: string; variations: ProgressVariation[]; theme: AppTheme; back: () => void; openWorkout: (id: string) => void; initialVariationId?: string; refreshing?: boolean }) {
  const [selection, setSelection] = useState(initialVariationId), [choosing, setChoosing] = useState(false);
  const [unit, setUnit] = useState<'lb' | 'kg'>(() => (variations.find(item => item.variationId === initialVariationId) ?? variations[0])?.sessions[0]?.sets[0]?.unit === 'kg' ? 'kg' : 'lb');
  const [history, setHistory] = useState({ id: '', count: 10 });
  const [explanationOpen, setExplanationOpen] = useState(false);
  const variation = variations.find(item => item.variationId === selection) ?? variations[0];
  const card = [styles.card, { backgroundColor: theme.surface, borderColor: theme.border }];
  const count = history.id === variation?.variationId ? history.count : 10;
  const description = (item: ProgressVariation) => `${item.locationName} / ${item.equipment} / ${item.bodyweight ? 'bodyweight reps' : `${item.dimension === 'mass' ? 'lb / kg' : 'plates'}, ${item.convention.replaceAll('_', ' ')}`}${item.archived ? ' / removed location' : ''}`;
  const metrics = variation ? progressMetrics(variation, unit) : null;
  const metadata = (label: string, value: string) => <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', gap: 8 }}>
    <Text style={{ color: theme.muted, width: 76, fontSize: 12 }}>{label}</Text>
    <Text style={{ color: theme.text, flex: 1, minWidth: 120, fontFamily: fonts.medium }}>{value}</Text>
  </View>;
  return <Screen theme={theme}>
    <Button theme={theme} variant="link" label="Back" onPress={back} />
    <Text accessibilityRole="header" style={[styles.heading, { color: theme.text }]}>{name}</Text>
    <Text style={{ color: theme.muted }}>Exercise history and progress</Text>
    {refreshing && <Text accessibilityLiveRegion="polite" style={{ color: theme.muted }}>Updating exercise history...</Text>}
    {!variation && <Text style={{ color: theme.muted }}>No completed sets remain for this exercise.</Text>}
    {variation && metrics && <>
      <View style={card}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <Text accessibilityRole="header" style={{ color: theme.text, fontFamily: fonts.bold, fontSize: 18 }}>Selected setup</Text>
          {variations.length > 1 && <Button theme={theme} variant="info" label={choosing ? 'Hide equipment options' : 'Change equipment'} onPress={() => setChoosing(value => !value)} />}
        </View>
        {metadata('Location', variation.locationName)}
        {metadata('Equipment', variation.equipment)}
        {metadata('Tracking', variation.bodyweight ? 'Bodyweight reps' : `${variation.convention.replaceAll('_', ' ')} / ${variation.dimension === 'mass' ? 'weight' : 'plates'}`)}
        {variation.archived && <Text style={{ color: theme.muted, fontSize: 12 }}>Removed location / history preserved</Text>}
        {choosing && variations.map(item => <Pressable key={item.variationId} accessibilityRole="button" accessibilityLabel={`Compare ${description(item)}`} accessibilityState={{ selected: item.variationId === variation.variationId }} onPress={() => { setSelection(item.variationId); setChoosing(false); }} style={{ padding: 12, minHeight: 48, gap: 4, borderRadius: 12, borderWidth: 1, borderColor: item.variationId === variation.variationId ? theme.infoBorder : theme.border, backgroundColor: item.variationId === variation.variationId ? theme.infoSoft : theme.soft }}>
          <Text style={{ color: theme.text, fontFamily: fonts.bold }}>{item.equipment}</Text>
          <Text style={{ color: theme.muted, fontSize: 12 }}>{item.locationName}{item.archived ? ' / removed location' : ''}</Text>
          <Text style={{ color: theme.muted, fontSize: 12 }}>{item.bodyweight ? 'Bodyweight reps' : `${item.convention.replaceAll('_', ' ')} / ${item.dimension === 'mass' ? 'weight' : 'plates'}`}</Text>
        </Pressable>)}
      </View>
      <View style={[styles.card, { backgroundColor: theme.successSoft, borderColor: theme.successBorder }]}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 16 }}>
          <View style={{ flex: 1, minWidth: 140, gap: 6 }}>
            <Text accessibilityRole="header" style={{ color: theme.text, fontFamily: fonts.bold, fontSize: 14 }}>{variation.bodyweight ? 'Highest reps per set' : 'Heaviest completed load'}</Text>
            <Text style={{ color: theme.success, fontFamily: fonts.bold, fontSize: 32 }}>{metrics.best === null ? 'No record' : `${formatProgressValue(metrics.best)} ${metrics.unit}`}</Text>
            <Text style={{ color: theme.muted, fontSize: 12 }}>{variation.sessions.length} {variation.sessions.length === 1 ? 'session recorded' : 'sessions recorded'}</Text>
          </View>
          {variation.dimension === 'mass' && <View style={{ gap: 8 }}>
            <Text style={{ color: theme.muted, fontSize: 12 }}>Display unit</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>{(['lb', 'kg'] as const).map(value => <Pressable key={value} accessibilityRole="button" accessibilityLabel={`Chart unit: ${value}`} accessibilityState={{ selected: unit === value }} aria-pressed={unit === value} onPress={() => setUnit(value)} style={{ minWidth: 56, minHeight: 44, borderRadius: 10, borderWidth: 1, borderColor: unit === value ? theme.success : theme.successBorder, backgroundColor: unit === value ? theme.surface : 'transparent', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: theme.success }}>{value}</Text></Pressable>)}</View>
          </View>}
        </View>
      </View>
      <View style={card}>
        <Text accessibilityRole="header" style={{ color: theme.text, fontFamily: fonts.bold }}>Recent sessions</Text>
        <ProgressChart metrics={metrics} theme={theme} openWorkout={openWorkout} />
        <Pressable accessibilityRole="button" accessibilityLabel="How comparisons work" accessibilityState={{ expanded: explanationOpen }} onPress={() => setExplanationOpen(value => !value)} style={{ minHeight: 44, padding: 12, borderRadius: 10, backgroundColor: theme.infoSoft, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Text style={{ flex: 1, color: theme.info, fontFamily: fonts.medium }}>How comparisons work</Text><Text accessible={false} style={{ color: theme.info }}>{explanationOpen ? '−' : '+'}</Text>
        </Pressable>
        {explanationOpen && <View style={{ gap: 12 }}>
          <Text style={{ color: theme.muted, fontSize: 12, lineHeight: 18 }}>The recorded best uses all sessions on this equipment. Each chart bar is one session, spaced equally; only the latest 12 are shown.</Text>
          <Text style={{ color: theme.muted, fontSize: 12, lineHeight: 18 }}>Other gyms, machines, load conventions, plate counts and bodyweight modes stay separate.</Text>
          <Text style={{ color: theme.muted, fontSize: 12, lineHeight: 18 }}>{variation.bodyweight ? 'Reps are shown per completed set.' : 'Loads are compared regardless of reps; this is not a strength score.'}</Text>
          {variation.dimension === 'mass' && <Text style={{ color: theme.muted, fontSize: 12, lineHeight: 18 }}>Display values convert lb/kg and round to two decimals. Saved sets keep their original units and {variation.convention.replaceAll('_', ' ')} convention.</Text>}
        </View>}
      </View>
      <Text accessibilityRole="header" style={{ color: theme.text, fontFamily: fonts.bold }}>Session history / newest first</Text>
      {variation.sessions.slice(0, count).map(session => <SessionCard key={`${variation.variationId}:${session.workoutId}`} session={session} bodyweight={variation.bodyweight} theme={theme} openWorkout={openWorkout} />)}
      {count < variation.sessions.length && <Button theme={theme} label="Show 10 more sessions" onPress={() => setHistory({ id: variation.variationId, count: count + 10 })} />}
    </>}
  </Screen>;
}
