import { Pressable, Text, View } from 'react-native';
import { Button, Screen, styles } from '../../ui/controls';
import { fonts, type AppTheme } from '../../ui/theme';

export function SettingsScreen({ theme, onBack, onBackup }: { theme: AppTheme; onBack: () => void; onBackup: () => void }) {
  return <Screen theme={theme}>
    <Button theme={theme} variant="link" label="Back to Home" onPress={onBack} />
    <Text accessibilityRole="header" style={[styles.heading, { color: theme.text }]}>Settings</Text>
    <Text style={[styles.subtitle, { color: theme.muted }]}>Manage your workout journal.</Text>
    <View style={{ gap: 10 }}>
      <Text accessibilityRole="header" style={{ color: theme.muted, fontFamily: fonts.bold, fontSize: 12, letterSpacing: 1 }}>YOUR DATA</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Backup and restore" accessibilityHint="Save your journal or restore a JSON backup" onPress={onBackup}
        style={({ pressed }) => [styles.card, { backgroundColor: theme.surface, borderColor: theme.border, flexDirection: 'row', alignItems: 'center', gap: 12, opacity: pressed ? 0.75 : 1 }]}>
        <View style={{ flex: 1, gap: 6 }}>
          <Text style={{ color: theme.info, fontFamily: fonts.bold, fontSize: 17 }}>Backup and restore</Text>
          <Text style={[styles.subtitle, { color: theme.muted }]}>Save a complete copy of your workouts, routines, goals and unfinished workout.</Text>
        </View>
        <Text accessible={false} style={{ color: theme.info, fontSize: 26 }}>{'\u203A'}</Text>
      </Pressable>
    </View>
  </Screen>;
}
