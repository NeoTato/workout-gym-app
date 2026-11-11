import { randomUUID } from 'expo-crypto';
import { useRef, useState } from 'react';
import { Alert, Keyboard, Modal, Pressable, Text, TextInput, View } from 'react-native';
import type { LoggedExercise } from '../../domain/exerciseLibrary';
import type { ExerciseDraft } from '../../domain/workout';
import { compatibleNoteMatches, noteToExercise, NOTES_LIMIT, parseWorkoutNotes, type NotesResult } from '../../domain/workoutNotes';
import { Button, Screen, styles } from '../../ui/controls';
import { useAppTheme } from '../../ui/appearanceContext';
import { fonts } from '../../ui/theme';

export function NotesImportDialog({ library, close, importExercises, busy }: {
  library: LoggedExercise[]; close: () => void; importExercises: (exercises: ExerciseDraft[]) => void; busy: boolean;
}) {
  const theme = useAppTheme();
  const [text, setText] = useState(''), [result, setResult] = useState<NotesResult | null>(null), [error, setError] = useState('');
  const [excluded, setExcluded] = useState<number[]>([]), [matches, setMatches] = useState<Record<number, LoggedExercise>>({});
  const [expanded, setExpanded] = useState<number | null>(null), [reviewed, setReviewed] = useState(false);
  const importing = useRef(false);
  const unresolved = result?.issues.filter(issue => !excluded.includes(issue.line)).length ?? 0;
  const count = result?.exercises.length ?? 0;
  const cancel = () => {
    Keyboard.dismiss();
    if (!text.trim()) { close(); return; }
    Alert.alert('Leave notes import?', 'These pasted notes have not been added to your draft.', [{ text: 'Keep reviewing', style: 'cancel' }, { text: 'Leave', style: 'destructive', onPress: close }]);
  };
  const footer = <>
    {error && <Text accessibilityRole="alert" style={{ color: theme.danger }}>{error}</Text>}
    {result ? <>
      <Pressable accessibilityRole="checkbox" accessibilityLabel="I reviewed the detected sets and assumptions" accessibilityState={{ checked: reviewed }} onPress={() => setReviewed(value => !value)} style={{ minHeight: 48, flexDirection: 'row', gap: 12, alignItems: 'center' }}>
        <Text style={{ color: reviewed ? theme.success : theme.muted, fontSize: 22 }}>{reviewed ? '☑' : '☐'}</Text><Text style={{ flex: 1, color: theme.text }}>I reviewed the detected sets and assumptions</Text>
      </Pressable>
      <Button theme={theme} primary label={`Add ${count} ${count === 1 ? 'exercise' : 'exercises'} to draft`} disabled={busy || !count || Boolean(unresolved) || !reviewed} onPress={() => {
        if (importing.current || busy || unresolved || !reviewed || !count) return;
        importing.current = true;
        try { importExercises(result.exercises.map(note => noteToExercise(note, randomUUID, matches[note.line]))); }
        catch { importing.current = false; setError('Unable to add these exercises. Your notes are still here.'); }
      }} />
      <Button theme={theme} variant="link" label="Edit pasted notes" onPress={() => { setResult(null); setError(''); setReviewed(false); }} />
    </> : <Button theme={theme} primary label="Review detected workout" disabled={busy || !text.trim()} onPress={() => {
      Keyboard.dismiss();
      try { setResult(parseWorkoutNotes(text)); setExcluded([]); setMatches({}); setReviewed(false); setExpanded(null); setError(''); }
      catch (failure) { setError(failure instanceof Error ? failure.message : 'Check your notes.'); }
    }} />}
  </>;
  return <Modal visible animationType="slide" onRequestClose={cancel}>
    <Screen theme={theme} footer={footer}>
      <Button theme={theme} variant="link" label="Cancel notes import" disabled={busy} onPress={cancel} />
      <Text accessibilityRole="header" style={[styles.heading, { color: theme.text }]}>{result ? 'Review your notes' : 'Paste workout notes'}</Text>
      {!result ? <>
        <Text style={[styles.subtitle, { color: theme.muted }]}>One exercise per line. Works offline. Choose the date and location in workout details.</Text>
        <Text style={{ color: theme.muted }}>Examples: pull ups 5reps 5reps{ '\n' }pulldown 70lbsx13 100lbsx12</Text>
        <TextInput accessibilityLabel="Workout notes" multiline value={text} textAlignVertical="top" autoCorrect={false} placeholder="Paste your workout here" placeholderTextColor={theme.muted} onChangeText={value => {
          if (value.length > NOTES_LIMIT) { setError('Notes exceed 20,000 characters. Paste a smaller section; your previous text is unchanged.'); return; }
          setText(value); setError('');
        }}
          style={[styles.input, { minHeight: 240, color: theme.text, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border }]} />
        <Text style={{ color: theme.muted, fontSize: 12 }}>Nothing is saved to history. Adding notes appends to your draft and keeps existing exercises.</Text>
      </> : <>
        <Text style={{ color: theme.text }}>{count} exercises · {result.exercises.reduce((total, note) => total + note.sets.length, 0)} sets</Text>
        <Text style={{ color: theme.muted }}>Tap an exercise to inspect sets or link a saved name. Confirm equipment and total/per-hand/per-side load in the workout editor. New exercises remain uncategorized.</Text>
        {result.issues.map(issue => <View key={issue.line} style={[styles.card, { backgroundColor: theme.surface, borderColor: excluded.includes(issue.line) ? theme.border : theme.danger }]}>
          <Text style={{ color: theme.text, fontFamily: fonts.bold }}>Line {issue.line}{excluded.includes(issue.line) ? ' · Excluded' : ' · Needs attention'}</Text>
          <Text selectable style={{ color: theme.text }}>{issue.source}</Text><Text style={{ color: theme.muted }}>{issue.reason}</Text>
          <Button theme={theme} variant={excluded.includes(issue.line) ? 'info' : 'danger'} label={`${excluded.includes(issue.line) ? 'Keep' : 'Exclude'} line ${issue.line}`} onPress={() => { setExcluded(value => value.includes(issue.line) ? value.filter(line => line !== issue.line) : [...value, issue.line]); setReviewed(false); }} />
        </View>)}
        {Boolean(unresolved) && <Text accessibilityRole="alert" style={{ color: theme.danger }}>Edit your notes or exclude each unreadable line before adding exercises.</Text>}
        {result.exercises.map(note => {
          const match = matches[note.line], suggestions = compatibleNoteMatches(note, library), open = expanded === note.line;
          return <View key={note.line} style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Pressable accessibilityRole="button" accessibilityLabel={`Review line ${note.line}: ${match?.name ?? note.name}`} accessibilityState={{ expanded: open }} onPress={() => setExpanded(open ? null : note.line)} style={{ minHeight: 48, gap: 4 }}>
              <Text style={{ color: theme.text, fontFamily: fonts.bold }}>{match?.name ?? note.name} {open ? '−' : '+'}</Text>
              <Text style={{ color: theme.muted }}>{note.sets.length} sets · {note.bodyweight ? 'Bodyweight' : note.unit} · {match ? [match.category, match.subcategory].filter(Boolean).join(' / ') || 'Uncategorized' : 'New / unlinked'}</Text>
            </Pressable>
            {note.inferredUnit && <Text style={{ color: theme.info, fontSize: 12 }}>Unit inferred: {note.unit} carried forward within this line.</Text>}
            {open && <>
              <Text selectable style={{ color: theme.muted }}>From notes: {note.source}</Text>
              {note.sets.map((set, index) => <Text key={index} style={{ color: theme.text }}>Set {index + 1}: {note.bodyweight ? '' : `${set.weight} ${note.unit} × `}{set.reps} reps</Text>)}
              {suggestions.length > 0 && <Text style={{ color: theme.muted, fontSize: 12 }}>Saved exercise suggestions</Text>}
              {suggestions.map(item => <Button key={item.id} theme={theme} variant="info" label={`Use ${item.name}`} onPress={() => { setMatches(value => ({ ...value, [note.line]: item })); setReviewed(false); }} />)}
              {match && <Button theme={theme} variant="link" label={`Keep original name on line ${note.line}`} onPress={() => { setMatches(value => { const next = { ...value }; delete next[note.line]; return next; }); setReviewed(false); }} />}
            </>}
          </View>;
        })}
        <Text style={{ color: theme.muted, fontSize: 12 }}>Imported sets are marked complete. You can edit everything before Finish workout. Repeated lines stay separate; importing twice creates duplicates.</Text>
      </>}
    </Screen>
  </Modal>;
}
