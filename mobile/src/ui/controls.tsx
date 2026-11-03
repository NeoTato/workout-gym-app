import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fonts, type AppTheme } from './theme';

export function Screen({ theme, children }: { theme: AppTheme; children: ReactNode }) {
  return <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.page}>{children}</ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
export function Button({ theme, label, accessibilityLabel, onPress, primary = false, disabled = false }: {
  theme: AppTheme; label: string; accessibilityLabel?: string; onPress: () => void; primary?: boolean; disabled?: boolean;
}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [styles.button, { backgroundColor: primary ? theme.primary : theme.accentSoft, opacity: disabled ? 0.5 : pressed ? 0.8 : 1 }]}>
    <Text style={{ fontFamily: fonts.bold, color: primary ? '#35201C' : theme.accent, textAlign: 'center' }}>{label}</Text>
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
      style={[styles.choice, { borderColor: value === option.value ? theme.primary : 'transparent', backgroundColor: theme.accentSoft }]}>
      <Text style={{ color: theme.accent, fontFamily: fonts.bold, fontSize: 12 }}>{option.label}</Text>
    </Pressable>)}</View>
  </View>;
}
export const styles = StyleSheet.create({
  page: { padding: 24, gap: 20, width: '100%', maxWidth: 640, alignSelf: 'center', paddingBottom: 48 },
  heading: { fontFamily: fonts.bold, fontSize: 28 },
  subtitle: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 22 },
  card: { padding: 20, borderRadius: 20, gap: 16 },
  button: { borderRadius: 9999, padding: 16, minHeight: 48, justifyContent: 'center' },
  input: { minHeight: 52, padding: 12, borderRadius: 16, fontFamily: fonts.medium, fontSize: 16 },
  field: { gap: 8, flexGrow: 1, minWidth: 72 },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: { borderRadius: 9999, borderWidth: 2, minHeight: 44, paddingHorizontal: 12, paddingVertical: 10, justifyContent: 'center' },
});
