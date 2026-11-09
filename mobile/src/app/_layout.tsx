import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppearanceProvider } from '../ui/AppearanceProvider';
import { useAppearance } from '../ui/appearanceContext';
import { RestTimerProvider } from '../features/rest/RestTimerProvider';
import { RestTimerDock, RestTimerDialog } from '../features/rest/RestTimerControls';

export default function RootLayout() {
  return <AppearanceProvider><AppLayout /></AppearanceProvider>;
}
function AppLayout() {
  const { scheme, theme, ready } = useAppearance();
  // Runtime loading works in Expo Go without a custom native build.
  const [loaded, error] = useFonts({
    'Recursive-Medium': require('../../assets/fonts/recursive.ttf'),
    'Recursive-Bold': require('../../assets/fonts/recursive-bold.ttf'),
  });

  return (
    <SafeAreaProvider>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      {!loaded || !ready ? (
        <View style={[styles.loading, { backgroundColor: theme.background }]}>
          {error ? (
            <Text accessibilityRole="alert" style={{ color: theme.text }}>
              Unable to load the app’s fonts. Please close and reopen the app.
            </Text>
          ) : (
            <ActivityIndicator accessibilityLabel="Loading workout journal" color={theme.accent} />
          )}
        </View>
      ) : (
        <RestTimerProvider><View style={{ flex: 1 }}>
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.background } }} />
          <RestTimerDock /><RestTimerDialog />
        </View></RestTimerProvider>
      )}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
});
