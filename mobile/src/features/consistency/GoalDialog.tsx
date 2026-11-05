import { useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { Button, styles } from '../../ui/controls';
import { fonts, type AppTheme } from '../../ui/theme';

export function GoalDialog({ theme, initial, currentTarget, nextWeekLabel, save, close }: {
  theme: AppTheme; initial: number; currentTarget: number; nextWeekLabel: string;
  save: (target: number) => Promise<void>; close: () => void;
}) {
  const [target, setTarget] = useState(String(initial)), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const busyRef = useRef(false);
  const dismiss = () => { if (!busyRef.current) close(); };
  const submit = async () => {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true); setError('');
    try { await save(Number(target)); close(); }
    catch { setError('Unable to save your target. Try again.'); }
    finally { busyRef.current = false; setBusy(false); }
  };
  return <Modal transparent animationType="fade" onRequestClose={dismiss}>
    <View style={{ flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#00000066' }}>
      <View accessibilityViewIsModal style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border, width: '100%', maxWidth: 520, alignSelf: 'center', maxHeight: '90%' }]}>
        <ScrollView contentContainerStyle={{ gap: 16 }}>
          <Text accessibilityRole="header" style={[styles.heading, { color: theme.text }]}>Weekly target</Text>
          <Text style={{ color: theme.muted }}>Choose active days, with any split or location. Changes start {nextWeekLabel}. This week stays at {currentTarget} days.</Text>
          <Text style={{ color: theme.muted }}>Active days per week</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {Array.from({ length: 7 }, (_, index) => String(index + 1)).map(value => <Pressable key={value} accessibilityRole="button" accessibilityLabel={`Active days per week: ${value}`} accessibilityState={{ selected: target === value, disabled: busy }} aria-pressed={target === value} disabled={busy} onPress={() => setTarget(value)}
              style={{ flexBasis: '20%', flexGrow: 1, minWidth: 44, minHeight: 48, borderRadius: 10, borderWidth: 1, borderColor: target === value ? theme.primary : 'transparent', backgroundColor: target === value ? theme.accentSoft : theme.soft, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ color: target === value ? theme.accent : theme.muted, fontFamily: fonts.bold }}>{value}</Text>
            </Pressable>)}
          </View>
          {initial !== currentTarget && Number(target) === currentTarget && <Text style={{ color: theme.muted }}>This cancels your scheduled change.</Text>}
          {!!error && <Text accessibilityRole="alert" style={{ color: theme.danger }}>{error}</Text>}
          <Button theme={theme} primary label={busy ? 'Saving target...' : 'Save target'} onPress={() => { void submit(); }} disabled={busy || Number(target) === initial} />
          <Button theme={theme} label="Cancel" onPress={dismiss} disabled={busy} />
        </ScrollView>
      </View>
    </View>
  </Modal>;
}
