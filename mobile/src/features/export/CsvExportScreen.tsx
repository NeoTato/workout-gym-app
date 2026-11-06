import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { ScrollView, Text, View } from 'react-native';
import type { CsvExport, CsvSelection } from '../../domain/csvExport';
import { activityDateValue } from '../../domain/workoutCalendar';
import { Button, Choice, Screen, styles } from '../../ui/controls';
import { fonts, type AppTheme } from '../../ui/theme';
import { DateTimeField } from '../workouts/DateTimeField';

export function CsvExportScreen({ theme, today, read, save, onBack }: {
  theme: AppTheme; today: string; read: (selection: CsvSelection) => Promise<CsvExport>; save: (text: string) => Promise<string>; onBack: () => void;
}) {
  const [kind, setKind] = useState<'all' | 'range'>('all');
  const [from, setFrom] = useState(today.slice(0, 7) + '-01'), [to, setTo] = useState(today);
  const [result, setResult] = useState<CsvExport | null>(null), [busy, setBusy] = useState(''), [error, setError] = useState(''), [message, setMessage] = useState('');
  const locked = useRef(false), alive = useRef(true);
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null), reveal = useRef(false);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const clear = () => { setResult(null); setError(''); setMessage(''); };
  async function action(label: string, work: () => Promise<void>) {
    if (locked.current) return;
    locked.current = true; setBusy(label); setError(''); setMessage('');
    try { await work(); }
    catch (failure) { if (alive.current) setError(failure instanceof Error ? failure.message : 'Unable to export. Try again.'); }
    finally { locked.current = false; if (alive.current) setBusy(''); }
  }
  const preview = () => action('Preparing export...', async () => {
    setResult(null);
    reveal.current = true;
    const next = await read(kind === 'all' ? { kind } : { kind, from, to });
    if (alive.current) setResult(next);
  });
  const exportFile = () => action('Preparing file...', async () => {
    if (!result) return;
    const next = await save(result.text); if (alive.current) setMessage(next);
  });
  const card = [styles.card, { backgroundColor: theme.surface, borderColor: theme.border }];
  const body = [styles.subtitle, { color: theme.muted }];
  const dateLabel = (date: string) => new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeZone: 'UTC' }).format(activityDateValue(date));
  return <Screen theme={theme} scrollRef={scroll}>
    <Button theme={theme} variant="link" label="Back to Settings" onPress={onBack} disabled={!!busy} />
    <Text accessibilityRole="header" style={[styles.heading, { color: theme.text }]}>Export workout history</Text>
    <Text style={body}>Take your completed workouts into a spreadsheet.</Text>
    <View style={card}>
      <Choice theme={theme} label="Include workouts" value={kind} options={[{ value: 'all', label: 'All history' }, { value: 'range', label: 'Date range' }]} disabled={!!busy}
        onChange={value => { setKind(value); clear(); }} />
      {kind === 'range' && <>
        <DateTimeField theme={theme} label="From date" mode="date" date={from} time="12:00" disabled={!!busy} onChange={value => { setFrom(value); clear(); }} />
        <DateTimeField theme={theme} label="To date" mode="date" date={to} time="12:00" disabled={!!busy} onChange={value => { setTo(value); clear(); }} />
        <Text style={body}>Includes both dates, using each workout’s recorded date.</Text>
      </>}
      <Button theme={theme} variant="info" label="Preview export" onPress={() => { void preview(); }} disabled={!!busy} />
    </View>
    {!!busy && <Text accessibilityLiveRegion="polite" style={body}>{busy}</Text>}
    {!!error && <Text accessibilityRole="alert" style={{ color: theme.danger }}>{error}</Text>}
    {!!message && <Text accessibilityLiveRegion="polite" style={[styles.subtitle, { color: theme.info }]}>{message}</Text>}
    {result && <View style={card} onLayout={() => { if (reveal.current) { reveal.current = false; requestAnimationFrame(() => scroll.current?.scrollToEnd({ animated: true })); } }}>
      <Text accessibilityRole="header" style={{ color: theme.text, fontFamily: fonts.bold, fontSize: 18 }}>Ready to export</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
        {([['workout', result.summary.workouts], ['completed set', result.summary.sets], ['active day', result.summary.activeDays]] as const).map(([singular, count]) => {
          const label = singular + (count === 1 ? '' : 's');
          return <View key={singular} accessible accessibilityLabel={`${count} ${label}`} style={{ flexGrow: 1, minWidth: 100, gap: 4 }}>
          <Text style={{ color: theme.text, fontFamily: fonts.bold, fontSize: 24 }}>{count.toLocaleString()}</Text><Text style={body}>{label}</Text>
        </View>; })}
      </View>
      {result.summary.firstDate && result.summary.lastDate ? <Text style={body}>Workout dates: {dateLabel(result.summary.firstDate)}{result.summary.lastDate !== result.summary.firstDate ? ` to ${dateLabel(result.summary.lastDate)}` : ''}</Text>
        : <Text style={body}>No completed workouts in this range. The file will contain column headings only.</Text>}
      <Text style={body}>One row per completed set, with original loads and units. Workout details repeat for each set. Unfinished workouts are excluded.</Text>
      <Button theme={theme} primary label="Export CSV" onPress={() => { void exportFile(); }} disabled={!!busy} />
    </View>}
    <Text style={body}>CSV is for spreadsheets. Use a JSON backup to restore your journal.</Text>
  </Screen>;
}
