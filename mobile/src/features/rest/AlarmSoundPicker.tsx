import { useCallback, useEffect, useState } from 'react';
import { AppState, Text, View } from 'react-native';
import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import { Button, Choice } from '../../ui/controls';
import { useAppTheme } from '../../ui/appearanceContext';
import { alarmSounds, alarmSource, type AlarmSound } from './alarmSounds';
import { useRestTimer } from './restContext';

export function AlarmSoundPicker() {
  const rest = useRestTimer(), theme = useAppTheme();
  const [playing, setPlaying] = useState(false), [error, setError] = useState('');
  const stop = useCallback(() => setPlaying(false), []);
  const failed = useCallback(() => { setPlaying(false); setError('Unable to preview sound. Check your media volume and try again.'); }, []);
  return <View style={{ gap: 8 }}>
    <Choice<AlarmSound> theme={theme} label="Alarm sound" value={rest.alarmSound} options={alarmSounds} onChange={value => { stop(); setError(''); rest.setAlarmSound(value); }} />
    <Button theme={theme} variant="info" label={playing ? 'Stop preview' : 'Preview sound'} onPress={() => { setError(''); setPlaying(value => !value); }} />
    <Text style={{ color: theme.muted, fontSize: 12 }}>In-app sound only. Selection lasts until you reopen the app. Notification sound is unchanged.</Text>
    {!!error && <Text accessibilityRole="alert" style={{ color: theme.danger }}>{error}</Text>}
    {playing && <SoundPreview sound={rest.alarmSound} stop={stop} failed={failed} />}
  </View>;
}
function SoundPreview({ sound, stop, failed }: { sound: AlarmSound; stop: () => void; failed: () => void }) {
  const player = useAudioPlayer(alarmSource(sound));
  useEffect(() => {
    let cancelled = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const subscription = AppState.addEventListener('change', status => { if (status !== 'active') stop(); });
    void setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: false, interruptionMode: 'mixWithOthers' }).then(() => {
      if (!cancelled) { player.loop = false; player.play(); timeout = setTimeout(stop, 2200); }
    }).catch(() => { if (!cancelled) failed(); });
    return () => { cancelled = true; if (timeout) clearTimeout(timeout); subscription.remove(); player.pause(); };
  }, [player, stop, failed]);
  return null;
}
