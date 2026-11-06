import { useEffect, useRef, useState } from 'react';
import { BackHandler, Modal, ScrollView, Text, View } from 'react-native';
import type { WorkoutStore } from '../../storage/workoutStore';
import type { BackupInspection } from '../../storage/backupStore';
import { Button, Screen, styles } from '../../ui/controls';
import { fonts, type AppTheme } from '../../ui/theme';
import type { BackupFile, BackupFiles } from './backupFiles.types';

export function BackupScreen({ theme, store, files, appVersion, onBack }: {
  theme: AppTheme; store: () => Promise<WorkoutStore>; files: BackupFiles; appVersion: string; onBack: () => void;
}) {
  const [review, setReview] = useState<BackupInspection | null>(null), [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(''), [error, setError] = useState(''), [message, setMessage] = useState(''), [restored, setRestored] = useState(false);
  const [filename, setFilename] = useState<string | null>(null);
  const selected = useRef<BackupFile | null>(null), locked = useRef(false), mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => locked.current);
    return () => { mounted.current = false; subscription.remove(); selected.current?.dispose(); };
  }, []);
  async function action(label: string, work: () => Promise<void>) {
    if (locked.current) return;
    locked.current = true; setBusy(label); setError(''); setMessage('');
    try { await work(); }
    catch (error) { if (mounted.current) setError(error instanceof Error ? error.message : 'Unable to complete this action. Try again.'); }
    finally { locked.current = false; if (mounted.current) setBusy(''); }
  }
  const exportCurrent = () => action('Preparing backup...', async () => {
    const text = await (await store()).exportBackup(appVersion);
    const result = await files.save(text); if (mounted.current) setMessage(result);
  });
  async function inspect(file: BackupFile) {
    const content = await file.read(), result = await (await store()).inspectBackup(content.text, content.fingerprint);
    if (mounted.current) setReview(result);
  }
  const choose = () => action('Inspecting file...', async () => {
    const file = await files.pick(); if (!file) return;
    if (!mounted.current) { file.dispose(); return; }
    selected.current?.dispose(); selected.current = file; setFilename(file.name); setReview(null); setRestored(false);
    await inspect(file);
  });
  const restore = () => action('Replacing data...', async () => {
    if (!selected.current || !review) return;
    const token = review.token; setConfirm(false); setReview(null);
    const content = await selected.current.read();
    await (await store()).restoreBackup(token, content.text, content.fingerprint);
    if (mounted.current) { selected.current.dispose(); selected.current = null; setRestored(true); setMessage('Backup restored. Your workouts, routines, goals and draft are ready.'); }
  });
  const card = [styles.card, { backgroundColor: theme.surface, borderColor: theme.border }];
  const body = [styles.subtitle, { color: theme.muted }];
  return <Screen theme={theme}>
    <Button theme={theme} variant="link" label="Back to Home" disabled={!!busy} onPress={onBack} />
    <Text accessibilityRole="header" style={[styles.heading, { color: theme.text }]}>Backup and restore</Text>
    <Text style={body}>Keep a complete copy of your journal, or move it to another device.</Text>
    <View style={card}>
      <Text accessibilityRole="header" style={{ color: theme.text, fontFamily: fonts.bold, fontSize: 18 }}>Save a backup</Text>
      <Text style={body}>Includes completed workouts, exercise categories, equipment, routines, locations, goal history and your unfinished workout.</Text>
      <Button theme={theme} variant="info" label="Export JSON backup" onPress={() => { void exportCurrent(); }} disabled={!!busy} />
      <Text style={body}>Save the file somewhere you trust. It contains your workout data in readable text.</Text>
    </View>
    <View style={card}>
      <Text accessibilityRole="header" style={{ color: theme.text, fontFamily: fonts.bold, fontSize: 18 }}>Restore a backup</Text>
      <Text style={body}>Choose a Workout Journal JSON file. You can review it before replacing anything.</Text>
      <Button theme={theme} label="Choose backup file" onPress={() => { void choose(); }} disabled={!!busy} />
      {filename !== null && !restored && <Text numberOfLines={2} style={body}>{filename}</Text>}
      {filename !== null && !review && !restored && !busy && <Button theme={theme} label="Inspect selected file again" onPress={() => { void action('Inspecting file...', async () => { if (selected.current) await inspect(selected.current); }); }} />}
    </View>
    {!!busy && <Text accessibilityLiveRegion="polite" style={body}>{busy}</Text>}
    {!!error && <Text accessibilityRole="alert" style={{ color: theme.danger }}>{error}</Text>}
    {!!message && <Text accessibilityLiveRegion="polite" style={[styles.subtitle, { color: restored ? theme.success : theme.info }]}>{message}</Text>}
    {review && <View style={card}>
      <Text accessibilityRole="header" style={{ color: theme.text, fontFamily: fonts.bold, fontSize: 18 }}>Backup preview</Text>
      <Text style={body}>Exported {new Date(review.exportedAt).toLocaleString()} · App {review.appVersion}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
        {[['Workouts', review.incoming.workouts], ['Exercises', review.incoming.exercises], ['Completed sets', review.incoming.sets], ['Routines', review.incoming.routines], ['Locations', review.incoming.locations], ['Weekly targets', review.incoming.goals]].map(([label, count]) => <View key={label} style={{ flexBasis: '42%', flexGrow: 1, gap: 4 }}>
          <Text style={{ color: theme.text, fontFamily: fonts.bold, fontSize: 24 }}>{count}</Text><Text style={body}>{label}</Text>
        </View>)}
      </View>
      <Text style={body}>{review.incoming.firstDate ? `${review.incoming.firstDate} to ${review.incoming.lastDate}` : 'No completed workouts in this backup.'}</Text>
      <Text style={body}>Unfinished workout: {review.incoming.hasDraft ? 'included' : 'none'}</Text>
      <View style={{ backgroundColor: theme.dangerSoft, padding: 14, borderRadius: 12, gap: 8 }}>
        <Text style={{ color: theme.danger, fontFamily: fonts.bold }}>This replaces all current data</Text>
        <Text style={[styles.subtitle, { color: theme.danger }]}>{review.current.workouts} current workouts, {review.current.routines} routines and {review.current.hasDraft ? 'your unfinished workout' : 'all other journal data'} will be replaced. Data is not merged.</Text>
      </View>
      <Button theme={theme} variant="info" label="Back up current data first" onPress={() => { void exportCurrent(); }} disabled={!!busy} />
      <Button theme={theme} variant="destructive" label="Review replacement" onPress={() => setConfirm(true)} disabled={!!busy} />
    </View>}
    {restored && <Button theme={theme} primary label="View restored journal" onPress={onBack} />}
    {confirm && review && <Modal transparent animationType="fade" onRequestClose={() => { if (!locked.current) setConfirm(false); }}>
      <View style={{ flex: 1, justifyContent: 'center', backgroundColor: '#00000066', padding: 20 }}>
        <View accessibilityViewIsModal style={[...card, { width: '100%', maxWidth: 520, alignSelf: 'center', maxHeight: '90%' }]}>
          <ScrollView contentContainerStyle={{ gap: 16 }}>
            <Text accessibilityRole="header" style={[styles.heading, { color: theme.text }]}>Replace your journal?</Text>
            <Text style={body}>All current workouts, routines, locations, exercises, goal history and the unfinished workout will be replaced by this backup. You can recover them only from a separate backup.</Text>
            <Button theme={theme} variant="destructive" label="Replace data" onPress={() => { void restore(); }} disabled={!!busy} />
            <Button theme={theme} label="Keep current data" onPress={() => setConfirm(false)} disabled={!!busy} />
          </ScrollView>
        </View>
      </View>
    </Modal>}
  </Screen>;
}
