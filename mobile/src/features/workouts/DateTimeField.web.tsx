import { Text, View } from 'react-native';
import type { DateTimeFieldProps } from './DateTimeField';

export function DateTimeField({ label, mode, date, time, maximumDate, theme, disabled, onChange }: DateTimeFieldProps) {
  return <View style={{ gap: 8 }}>
    <Text style={{ color: theme.muted }}>{label}</Text>
    <input aria-label={label} type={mode} value={mode === 'date' ? date : time} max={mode === 'date' ? maximumDate : undefined}
      disabled={disabled} onPaste={event => event.preventDefault()}
      onKeyDown={event => {
        if (event.key.length === 1) event.preventDefault();
        if ((event.key === 'Enter' || event.key === ' ') && typeof event.currentTarget.showPicker === 'function') {
          event.preventDefault(); event.currentTarget.showPicker();
        }
      }}
      onChange={event => { if (event.currentTarget.validity.valid && event.currentTarget.value) onChange(event.currentTarget.value); }}
      style={{ minHeight: 48, borderRadius: 16, padding: 12, border: 0, fontSize: 16, background: theme.background, color: theme.text, colorScheme: theme.background === '#19191C' ? 'dark' : 'light' }} />
  </View>;
}
