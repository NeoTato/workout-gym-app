import { useEffect, useState } from 'react';
import { AppState, Keyboard, Modal, Text, Vibration, View } from 'react-native';
import { useAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, styles } from '../../ui/controls';
import { useAppTheme } from '../../ui/appearanceContext';
import { useRestTimer } from './restContext';

export function RestAlarm() {
  const rest = useRestTimer();
  const { close, alarmEnabled } = rest;
  const timer = rest.state?.timer;
  const [ringing, setRinging] = useState('');
  const [dismissed, setDismissed] = useState('');
  const [active, setActive] = useState(AppState.currentState === 'active');
  const token = timer?.endsAt == null ? '' : `${timer.id}:${timer.endsAt}`;
  useEffect(() => {
    const subscription = AppState.addEventListener('change', status => { setActive(status === 'active'); if (status !== 'active') setRinging(''); });
    return () => subscription.remove();
  }, []);
  useEffect(() => {
    // Arm only future deadlines observed in the foreground. Never ring an old timer on reopening.
    if (!active || !alarmEnabled || !timer?.endsAt || token === dismissed) return;
    const delay = timer.endsAt - Date.now();
    if (delay <= 0) return;
    const timeout = setTimeout(() => { if (AppState.currentState !== 'active') return; Keyboard.dismiss(); close(); setRinging(token); }, delay);
    return () => clearTimeout(timeout);
  }, [active, alarmEnabled, timer?.endsAt, token, dismissed, close]);
  const visible = ringing === token && active && rest.alarmEnabled && Boolean(token) && token !== dismissed;
  if (!visible) return null;
  return <AlarmPresentation label={timer?.label ?? ''} stop={() => { setRinging(''); setDismissed(token); rest.change('end'); }} snooze={() => { setRinging(''); setDismissed(token); rest.change('extend'); }} />;
}

function AlarmPresentation({ label, stop, snooze }: { label: string; stop: () => void; snooze: () => void }) {
  const theme = useAppTheme();
  const player = useAudioPlayer(require('../../../assets/sounds/rest-alarm.wav'));
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let cancelled = false;
    Vibration.vibrate([0, 500, 500], true);
    void setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: false, interruptionMode: 'mixWithOthers' }).then(() => {
      if (!cancelled) { player.loop = true; player.play(); }
    }).catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; player.pause(); Vibration.cancel(); };
  }, [player]);
  return <Modal visible transparent animationType="none" onRequestClose={stop}>
    <SafeAreaView style={{ flex: 1, backgroundColor: '#00000099', justifyContent: 'center', padding: 24 }}>
      <View accessibilityViewIsModal style={[styles.card, { width: '100%', maxWidth: 440, alignSelf: 'center', backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text accessibilityRole="header" style={[styles.heading, { color: theme.text }]}>Rest complete</Text>
        <Text style={{ color: theme.muted }}>{label}</Text>
        <Text accessibilityRole="alert" style={{ color: theme.text }}>{failed ? 'Sound unavailable. Your rest is complete.' : 'Ready for your next set?'}</Text>
        <Button theme={theme} primary label="Stop alarm" onPress={stop} />
        <Button theme={theme} variant="info" label="Rest 30 sec more" onPress={snooze} />
      </View>
    </SafeAreaView>
  </Modal>;
}
