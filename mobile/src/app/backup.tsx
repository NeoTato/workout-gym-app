import Constants from 'expo-constants';
import { router, Stack } from 'expo-router';
import { useColorScheme } from 'react-native';
import { BackupScreen } from '../features/backup/BackupScreen';
import { backupFiles } from '../features/backup/backupFiles';
import { openStore } from '../storage/openStore';
import { getTheme } from '../ui/theme';

export default function BackupRoute() {
  return <><Stack.Screen options={{ gestureEnabled: false }} /><BackupScreen theme={getTheme(useColorScheme())} store={openStore} files={backupFiles} appVersion={Constants.expoConfig?.version ?? 'unknown'} onBack={() => { if (router.canGoBack()) router.back(); else router.replace('/settings'); }} onHome={() => router.replace('/')} /></>;
}
