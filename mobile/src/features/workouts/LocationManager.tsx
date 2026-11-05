import { useRef, useState } from 'react';
import { Alert, Modal, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Location } from '../../domain/workout';
import { Button, styles } from '../../ui/controls';
import type { AppTheme } from '../../ui/theme';

export function LocationManager({ locations, theme, busy, remove, close }: {
  locations: Location[]; theme: AppTheme; busy: boolean;
  remove: (id: string) => Promise<void>; close: () => void;
}) {
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(false);
  const gyms = locations.filter(location => location.kind === 'gym' && !location.archived);
  const dismiss = () => { if (!pending.current && !busy) close(); };
  return <Modal transparent animationType="fade" onRequestClose={dismiss}>
    <SafeAreaView style={{ flex: 1, backgroundColor: '#00000066', justifyContent: 'center', padding: 16 }}>
      <View testID="location-manager" accessibilityViewIsModal style={[styles.card, {
        backgroundColor: theme.surface, borderColor: theme.border, width: '100%', maxWidth: 480,
        maxHeight: '90%', alignSelf: 'center',
      }]}>
        <Text accessibilityRole="header" style={[styles.heading, { color: theme.text }]}>Manage locations</Text>
        <Text style={{ color: theme.muted }}>Remove gyms from future choices. Past workouts keep their location. Add the same gym again to restore it.</Text>
        <ScrollView style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 8 }}>
          {gyms.map(location => <View key={location.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Text style={{ color: theme.text, flex: 1 }}>{location.name}</Text>
            <Button theme={theme} variant="danger" label="Remove" accessibilityLabel={`Remove ${location.name}`} disabled={busy || removing}
              onPress={() => Alert.alert(`Remove ${location.name}?`, 'Past workouts will be kept. If selected for this draft, choose another location before continuing.', [
                { text: 'Keep', style: 'cancel' },
                { text: 'Remove', style: 'destructive', onPress: async () => {
                  if (pending.current) return;
                  pending.current = true; setRemoving(true); setError('');
                  try { await remove(location.id); }
                  catch { setError('Unable to remove this location. Try again.'); }
                  finally { pending.current = false; setRemoving(false); }
                } },
              ])} />
          </View>)}
          {!gyms.length && <Text style={{ color: theme.muted }}>No saved gyms to remove. Home is always available.</Text>}
        </ScrollView>
        {!!error && <Text accessibilityRole="alert" style={{ color: theme.danger }}>{error}</Text>}
        <Button theme={theme} label="Close locations" disabled={busy || removing} onPress={dismiss} />
      </View>
    </SafeAreaView>
  </Modal>;
}
