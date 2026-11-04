import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Modal, Platform, ScrollView, Text, View, useColorScheme } from 'react-native';
import { Button, styles } from '../../ui/controls';
import type { AppTheme } from '../../ui/theme';

export type DateTimeFieldProps = {
  label: string; mode: 'date' | 'time'; date: string; time: string; maximumDate: string;
  theme: AppTheme; disabled: boolean; onChange: (value: string) => void;
};

export function DateTimeField({ label, mode, date, time, maximumDate, theme, disabled, onChange }: DateTimeFieldProps) {
  const [candidate, setCandidate] = useState<Date | null>(null);
  const scheme = useColorScheme();
  const selected = new Date(`${date}T${time}:00Z`);
  const displayValue = Number.isFinite(selected.getTime()) ? new Intl.DateTimeFormat('en', mode === 'date'
    ? { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }
    : { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'UTC' }).format(selected) : mode === 'date' ? date : time;
  const close = () => setCandidate(null);
  function apply(value: Date) {
    const iso = value.toISOString();
    onChange(mode === 'date' ? iso.slice(0, 10) : iso.slice(11, 16));
    close();
  }
  const picker = candidate && <DateTimePicker testID="system-picker" value={candidate} mode={mode}
    // Wall-clock values are carried in UTC here; the domain layer converts them
    // to the workout's recorded timezone when saving, independent of device zone.
    timeZoneName="UTC" is24Hour
    maximumDate={mode === 'date' ? new Date(`${maximumDate}T23:59:59Z`) : undefined}
    display={Platform.OS === 'ios' ? mode === 'date' ? 'inline' : 'spinner' : mode === 'date' ? 'calendar' : 'clock'}
    themeVariant={scheme === 'dark' ? 'dark' : 'light'} accentColor={theme.primary} textColor={theme.text}
    onDismiss={close} onValueChange={(_event, value) => {
      if (!Number.isFinite(value.getTime())) return;
      if (Platform.OS === 'android') apply(value); else setCandidate(value);
    }} />;
  return <View style={{ gap: 8 }}>
    <Text style={{ color: theme.muted }}>{label}</Text>
    <Button theme={theme} label={`${displayValue}  ▾`} accessibilityLabel={`${label}: ${mode === 'date' ? date : time}`} disabled={disabled} onPress={() => {
      const value = new Date(`${date}T${time}:00Z`);
      setCandidate(Number.isFinite(value.getTime()) ? value : new Date());
    }} />
    {Platform.OS === 'ios' ? <Modal visible={candidate !== null} transparent animationType="slide" onRequestClose={close}>
      <View style={{ flex: 1, justifyContent: 'center', padding: 16, backgroundColor: '#00000066' }}>
        <ScrollView accessibilityViewIsModal
          style={{ flexGrow: 0, flexShrink: 1, width: '100%', maxWidth: 440, maxHeight: '100%', alignSelf: 'center' }}
          contentContainerStyle={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text accessibilityRole="header" style={[styles.heading, { color: theme.text }]}>{label}</Text>
          {picker}
          <Button theme={theme} label="Cancel" onPress={close} />
          <Button theme={theme} label="Done" primary onPress={() => { if (candidate) apply(candidate); }} />
        </ScrollView>
      </View>
    </Modal> : picker}
  </View>;
}
