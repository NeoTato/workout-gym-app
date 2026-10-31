import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { getTheme } from '../ui/theme';

export default function RootLayout() {
  const scheme = useColorScheme();
  const theme = getTheme(scheme);
  // SDK 57 runtime loading also works in Expo Go, without a custom native build.
  const [loaded, error] = useFonts({
    'Recursive-Medium': require('../../assets/fonts/recursive.ttf'),
    'Recursive-Bold': require('../../assets/fonts/recursive-bold.ttf'),
  });

  return (
    <SafeAreaProvider>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      {!loaded ? (
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
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.background } }} />
      )}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
});
