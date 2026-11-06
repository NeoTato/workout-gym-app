import { router } from 'expo-router';
import { useColorScheme } from 'react-native';
import { SettingsScreen } from '../features/settings/SettingsScreen';
import { getTheme } from '../ui/theme';

export default function SettingsRoute() {
  return <SettingsScreen theme={getTheme(useColorScheme())} onBack={() => { if (router.canGoBack()) router.back(); else router.replace('/'); }} onBackup={() => router.push('/backup')} />;
}
