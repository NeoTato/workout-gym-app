import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { customRestSeconds, restClock, restRemaining } from '../../domain/restTimer';
import { Button, Choice, Field, styles } from '../../ui/controls';
import { useAppTheme } from '../../ui/appearanceContext';
import { fonts } from '../../ui/theme';
import { useRestTimer } from './restContext';
import { useRestClock } from './useRestClock';

export function RestTimerDock() {
  const rest = useRestTimer(), theme = useAppTheme(), timer = rest.state?.timer ?? null;
  const now = useRestClock(timer), remaining = restRemaining(timer, now);
  if (!timer && (!rest.error || rest.visible)) return null;
  return <SafeAreaView edges={['bottom']} style={{ backgroundColor: theme.surface, borderTopWidth: 1, borderTopColor: theme.border }}>
    <View style={{ width: '100%', maxWidth: 640, alignSelf: 'center', paddingHorizontal: 16, paddingVertical: 8, gap: 8 }}>
      {timer && <>
        <Pressable accessibilityRole="button" accessibilityLabel={`Rest timer, ${remaining ? restClock(remaining) + ' remaining' : 'rest complete'}. Open timer options`} onPress={() => rest.open()} disabled={rest.busy}
          style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Text style={{ color: remaining ? theme.info : theme.success, fontFamily: fonts.bold, fontSize: 28, fontVariant: ['tabular-nums'] }}>{restClock(remaining)}</Text>
          <View style={{ flex: 1, gap: 2 }}>
            <Text accessibilityLiveRegion="polite" style={{ color: theme.text, fontFamily: fonts.bold }}>{remaining === 0 ? 'Rest complete' : timer.endsAt === null ? 'Rest paused' : 'Resting'}</Text>
            <Text numberOfLines={1} style={{ color: theme.muted, fontSize: 12 }}>{timer.label}</Text>
          </View><Text style={{ color: theme.info }}>Options</Text>
        </Pressable>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <View style={{ flex: 1, minWidth: 76 }}><Button theme={theme} variant="info" label="+30 sec" disabled={rest.busy} onPress={() => rest.change('extend')} /></View>
          {remaining > 0 && <View style={{ flex: 1, minWidth: 76 }}><Button theme={theme} label={timer.endsAt === null ? 'Resume' : 'Pause'} disabled={rest.busy} onPress={() => rest.change(timer.endsAt === null ? 'resume' : 'pause')} /></View>}
          <View style={{ flex: 1, minWidth: 76 }}><Button theme={theme} variant="danger" label={remaining ? 'End rest' : 'Done'} disabled={rest.busy} onPress={() => rest.change('end')} /></View>
        </View>
      </>}
      {!!rest.error && !rest.visible && <><Text accessibilityRole="alert" style={{ color: theme.danger, fontSize: 12 }}>{rest.error}</Text><Button theme={theme} variant="link" label="Retry timer" onPress={rest.reload} disabled={rest.busy} /></>}
    </View>
  </SafeAreaView>;
}

export function RestTimerDialog() {
  const rest = useRestTimer();
  return rest.visible ? <RestTimerDialogContent /> : null;
}
function RestTimerDialogContent() {
  const rest = useRestTimer(), theme = useAppTheme();
  const initial = rest.state?.seconds ?? 90;
  const [minutes, setMinutes] = useState(() => String(Math.floor(initial / 60))), [seconds, setSeconds] = useState(() => String(initial % 60)), [error, setError] = useState('');
  const duration = Number(minutes) * 60 + Number(seconds);
  const option = (key: 'autoStart' | 'reminders', title: string, hint: string, available = true) => <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, minHeight: 48 }}>
    <View style={{ flex: 1, gap: 4 }}><Text style={{ color: theme.text, fontFamily: fonts.medium }}>{title}</Text><Text style={{ color: theme.muted, fontSize: 12, lineHeight: 18 }}>{hint}</Text></View>
    <Pressable accessibilityRole="switch" accessibilityLabel={title} accessibilityState={{ checked: Boolean(rest.state?.[key]), disabled: rest.busy || !available }} disabled={rest.busy || !available}
      onPress={() => rest.preference(key, !rest.state?.[key])}
      style={{ minWidth: 56, minHeight: 48, alignItems: 'center', justifyContent: 'center', opacity: rest.busy || !available ? 0.5 : 1 }}>
      <View pointerEvents="none" style={{ width: 52, height: 32, borderRadius: 16, padding: 3, backgroundColor: rest.state?.[key] ? theme.info : theme.border, alignItems: rest.state?.[key] ? 'flex-end' : 'flex-start', justifyContent: 'center' }}>
        <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: theme.surface }} />
      </View>
    </Pressable>
  </View>;
  return <Modal visible={rest.visible} transparent animationType="fade" onRequestClose={rest.close}>
    <SafeAreaView style={{ flex: 1, backgroundColor: '#00000066', justifyContent: 'center', padding: 16 }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ width: '100%', maxWidth: 480, alignSelf: 'center', maxHeight: '100%' }}>
        <View accessibilityViewIsModal testID="rest-timer-dialog" style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border, flexShrink: 1 }]}>
          <Text accessibilityRole="header" style={[styles.heading, { color: theme.text }]}>Rest timer</Text>
          <ScrollView keyboardShouldPersistTaps="handled" style={{ flexGrow: 0, flexShrink: 1 }} contentContainerStyle={{ gap: 16 }}>
            <Text style={{ color: theme.muted }}>{rest.label}</Text>
            <Choice theme={theme} label="Quick rest" value={String(duration)} options={[{ value: '60', label: '1 min' }, { value: '90', label: '1:30' }, { value: '120', label: '2 min' }]} disabled={rest.busy}
              onChange={value => { setMinutes(String(Math.floor(Number(value) / 60))); setSeconds(String(Number(value) % 60)); setError(''); }} />
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Field theme={theme} label="Rest minutes" caption="Minutes" value={minutes} keyboardType="number-pad" maxLength={2} editable={!rest.busy} onChangeText={value => { setMinutes(value); setError(''); }} />
              <Field theme={theme} label="Rest seconds" caption="Seconds" value={seconds} keyboardType="number-pad" maxLength={2} editable={!rest.busy} onChangeText={value => { setSeconds(value); setError(''); }} />
            </View>
            <Text style={{ color: theme.muted, fontSize: 12 }}>Options for this workout</Text>
            {option('autoStart', 'Auto-start after a new set', 'Starts when you leave valid set inputs, not while typing. Existing sets do not restart rest.')}
            {option('reminders', 'Notify when rest ends', rest.remindersAvailable ? 'Optional local reminder. Sound and lock-screen delivery depend on your phone settings.' : 'Reminders are unavailable in the web preview. The countdown still works.', rest.remindersAvailable)}
            {!!rest.state?.timer && <>
              <Text style={{ color: theme.muted, fontSize: 12 }}>Starting a new rest replaces the current countdown.</Text>
              <Button theme={theme} variant="info" label="Restart current rest" disabled={rest.busy} onPress={() => { rest.change('restart'); rest.close(); }} />
            </>}
            {!!(error || rest.error) && <Text accessibilityRole="alert" style={{ color: theme.danger }}>{error || rest.error}</Text>}
          </ScrollView>
          <Button theme={theme} primary label={rest.state?.timer ? 'Start new rest' : 'Start rest'} disabled={rest.busy} onPress={() => {
            try { const value = customRestSeconds(minutes, seconds); void rest.start(value); } catch (failure) { setError(failure instanceof Error ? failure.message : 'Check your rest time.'); }
          }} />
          <Button theme={theme} label="Close timer" disabled={rest.busy} onPress={rest.close} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  </Modal>;
}
