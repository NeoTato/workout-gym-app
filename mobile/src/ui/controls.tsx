import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fonts, type AppTheme } from './theme';

export function Screen({ theme, children, footer }: { theme: AppTheme; children: ReactNode; footer?: ReactNode }) {
  return <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.page}>{children}</ScrollView>
      {footer && <View style={{ borderTopWidth: 1, borderTopColor: theme.border, backgroundColor: theme.background }}>
        <View style={styles.footer}>{footer}</View>
      </View>}
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
export function Button({ theme, label, accessibilityLabel, onPress, primary = false, disabled = false, variant }: {
  theme: AppTheme; label: string; accessibilityLabel?: string; onPress: () => void; primary?: boolean; disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'add' | 'danger' | 'destructive' | 'link';
}) {
  const kind = variant ?? (primary ? 'primary' : 'secondary');
  const quiet = kind === 'link' || kind === 'danger';
  const backgroundColor = kind === 'primary' ? theme.primary : kind === 'add' ? theme.successSoft : kind === 'destructive' ? theme.dangerSoft : quiet ? 'transparent' : theme.surface;
  const color = kind === 'primary' ? '#35201C' : kind === 'add' ? theme.success : kind === 'danger' || kind === 'destructive' ? theme.danger : kind === 'link' ? theme.muted : theme.text;
  const borderColor = kind === 'add' ? theme.successBorder : kind === 'secondary' ? theme.border : 'transparent';
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [styles.button, { backgroundColor, borderColor, opacity: disabled ? 0.5 : pressed ? 0.8 : 1 }, quiet && { alignSelf: 'flex-start', paddingHorizontal: 4, borderRadius: 8, minHeight: 44 }]}>
    <Text style={{ fontFamily: quiet ? fonts.medium : fonts.bold, color, textAlign: quiet ? 'left' : 'center' }}>{label}</Text>
  </Pressable>;
}
export function Field({ theme, label, caption, ...props }: TextInputProps & { theme: AppTheme; label: string; caption?: string }) {
  return <View style={styles.field}>
    <Text style={{ color: theme.muted, fontFamily: fonts.medium, fontSize: 12 }}>{caption ?? label}</Text>
    <TextInput {...props} accessibilityLabel={label} placeholderTextColor={theme.muted}
      style={[styles.input, { color: theme.text, backgroundColor: theme.background }]} />
  </View>;
}
export function Choice<T extends string>({ theme, label, value, options, onChange, disabled = false }: {
  theme: AppTheme; label: string; value: T; options: readonly { value: T; label: string }[];
  onChange: (value: T) => void; disabled?: boolean;
}) {
  return <View style={{ gap: 8 }}><Text style={{ color: theme.muted, fontFamily: fonts.medium }}>{label}</Text>
    <View style={styles.choices}>{options.map(option => <Pressable key={option.value} accessibilityRole="button"
      accessibilityLabel={`${label}: ${option.label}`} aria-pressed={value === option.value} accessibilityState={{ selected: value === option.value, disabled }}
      disabled={disabled} onPress={() => onChange(option.value)}
      style={[styles.choice, { borderColor: value === option.value ? theme.primary : 'transparent', backgroundColor: value === option.value ? theme.accentSoft : theme.soft }]}>
      <Text style={{ color: value === option.value ? theme.accent : theme.muted, fontFamily: fonts.bold, fontSize: 12 }}>{option.label}</Text>
    </Pressable>)}</View>
  </View>;
}
export const styles = StyleSheet.create({
  page: { padding: 20, gap: 16, width: '100%', maxWidth: 640, alignSelf: 'center', paddingBottom: 32 },
  footer: { padding: 16, gap: 8, width: '100%', maxWidth: 640, alignSelf: 'center' },
  heading: { fontFamily: fonts.bold, fontSize: 28 },
  subtitle: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 22 },
  card: { padding: 16, borderRadius: 19, gap: 14, borderWidth: 1, borderColor: 'transparent' },
  button: { borderRadius: 14, padding: 14, minHeight: 48, justifyContent: 'center', borderWidth: 1 },
  input: { minHeight: 48, padding: 12, borderRadius: 10, fontFamily: fonts.medium, fontSize: 16 },
  field: { gap: 8, flexGrow: 1, minWidth: 72 },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: { borderRadius: 10, borderWidth: 1, minHeight: 44, paddingHorizontal: 12, paddingVertical: 10, justifyContent: 'center' },
});
