import { useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Routine } from '../../domain/routine';
import { openStore } from '../../storage/openStore';
import { Button, Field, styles } from '../../ui/controls';
import type { AppTheme } from '../../ui/theme';
import { useRoutines } from './useRoutines';

type Props = { theme: AppTheme; close: () => void } & (
  { mode: 'choose'; locationId: string; choose: (routine: Routine) => void } |
  { mode: 'save'; workoutId: string; saved: (name: string) => void }
);

export function RoutineDialog(props: Props) {
  const { theme, close } = props;
  const library = useRoutines();
  const [name, setName] = useState(''), [rename, setRename] = useState<Routine | null>(null);
  const [managing, setManaging] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const pending = useRef(false);
  async function run(work: () => Promise<void>) {
    if (pending.current) return;
    pending.current = true; setBusy(true); setError('');
    try { await work(); }
    catch (failure) { setError(failure instanceof Error && /name|found/i.test(failure.message) ? failure.message : 'Unable to update routines. Try again.'); }
    finally { pending.current = false; setBusy(false); }
  }
  const dismiss = () => { if (!pending.current) close(); };
  async function save(replaceId?: string, replaceName?: string) {
    if (props.mode !== 'save') return;
    await run(async () => {
      const routine = await (await openStore()).saveWorkoutAsRoutine(props.workoutId, replaceName ?? name, replaceId);
      props.saved(routine.name);
    });
  }
  const blocked = busy || library.loading || Boolean(library.error);
  return <Modal transparent animationType="fade" onRequestClose={dismiss}>
    <SafeAreaView style={{ flex: 1, backgroundColor: '#00000066', justifyContent: 'center', padding: 16 }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ width: '100%', maxWidth: 480, alignSelf: 'center', maxHeight: '100%' }}>
        <View testID="routine-dialog" accessibilityViewIsModal style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border, flexShrink: 1 }]}>
          <Text accessibilityRole="header" style={[styles.heading, { color: theme.text }]}>{props.mode === 'save' ? 'Save as routine' : 'Choose routine'}</Text>
          <Text style={[styles.subtitle, { color: theme.muted }]}>{props.mode === 'save'
            ? 'Remember exercise order, setup, and set counts. New workouts start with blank measurements.'
            : 'Add an editable copy to this workout. You can skip exercises and change sets freely.'}</Text>
          <ScrollView keyboardShouldPersistTaps="handled" style={{ flexGrow: 0, flexShrink: 1 }} contentContainerStyle={{ gap: 12 }}>
            {props.mode === 'save' && <Field theme={theme} label="New routine name" value={name} onChangeText={setName} maxLength={80} editable={!busy} />}
            {library.loading && <Text style={{ color: theme.muted }}>Loading routines…</Text>}
            {!!library.error && <><Text accessibilityRole="alert" style={{ color: theme.danger }}>{library.error}</Text><Button theme={theme} label="Retry routines" onPress={library.reload} /></>}
            {!library.loading && !library.error && !library.items.length && <Text style={{ color: theme.muted }}>No routines yet. Open a completed workout and choose Save as routine.</Text>}
            {library.items.map(routine => <View key={routine.id} style={{ gap: 6 }}>
              <Button theme={theme} variant={props.mode === 'save' ? 'danger' : 'secondary'} label={props.mode === 'save' ? `Replace ${routine.name}` : routine.name} accessibilityLabel={`${props.mode === 'choose' ? 'Use' : 'Replace'} routine ${routine.name}`} disabled={blocked || (props.mode === 'choose' && !props.locationId)}
                onPress={() => {
                  if (props.mode === 'choose') props.choose(routine);
                  else Alert.alert(`Replace ${routine.name}?`, 'This updates the template from this completed workout. Past workouts and active drafts stay unchanged.', [
                    { text: 'Keep routine', style: 'cancel' }, { text: 'Replace', style: 'destructive', onPress: () => { void save(routine.id, routine.name); } },
                  ]);
                }} />
              <Text style={{ color: theme.muted, fontSize: 12 }}>{routine.sessionType} · {routine.locationName} · {routine.exercises.length} exercises</Text>
              {managing && <View style={{ flexDirection: 'row', gap: 20 }}>
                <Button theme={theme} variant="link" label="Rename" accessibilityLabel={`Rename routine ${routine.name}`} disabled={blocked} onPress={() => { setRename(routine); setName(routine.name); }} />
                <Button theme={theme} variant="danger" label="Remove" accessibilityLabel={`Remove routine ${routine.name}`} disabled={blocked} onPress={() => Alert.alert(`Remove ${routine.name}?`, 'This removes only the routine. Completed workouts and active drafts will be kept.', [
                  { text: 'Keep routine', style: 'cancel' }, { text: 'Remove', style: 'destructive', onPress: () => { void run(async () => { await (await openStore()).removeRoutine(routine.id); library.reload(); }); } },
                ])} />
              </View>}
            </View>)}
            {rename && <>
              <Field theme={theme} label="Routine name" value={name} onChangeText={setName} maxLength={80} editable={!busy} />
              <Button theme={theme} label="Save routine name" disabled={blocked || !name.trim()} onPress={() => { void run(async () => { await (await openStore()).renameRoutine(rename.id, name); setRename(null); setName(''); library.reload(); }); }} />
              <Button theme={theme} variant="link" label="Cancel rename" disabled={busy} onPress={() => { setRename(null); setName(''); }} />
            </>}
            {!!error && <Text accessibilityRole="alert" style={{ color: theme.danger }}>{error}</Text>}
          </ScrollView>
          {props.mode === 'save' && !rename && <Button theme={theme} variant="add" label="Create routine" disabled={blocked || !name.trim()} onPress={() => { void save(); }} />}
          {props.mode === 'choose' && <Button theme={theme} variant="link" label={managing ? 'Done managing routines' : 'Manage routines'} disabled={busy} onPress={() => { setManaging(value => !value); setRename(null); setName(''); }} />}
          <Button theme={theme} label="Close routines" disabled={busy} onPress={dismiss} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  </Modal>;
}
