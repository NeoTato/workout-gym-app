import Constants from 'expo-constants';
import { router, Stack } from 'expo-router';
import { BackupScreen } from '../features/backup/BackupScreen';
import { backupFiles } from '../features/backup/backupFiles';
import { openStore } from '../storage/openStore';
import { useAppearance } from '../ui/appearanceContext';

export default function BackupRoute() {
  const appearance = useAppearance();
  return <><Stack.Screen options={{ gestureEnabled: false }} /><BackupScreen theme={appearance.theme} store={openStore} files={backupFiles} appVersion={Constants.expoConfig?.version ?? 'unknown'} onBack={() => { if (router.canGoBack()) router.back(); else router.replace('/settings'); }} onHome={() => router.replace('/')} onRestored={() => { void appearance.reload(); }} /></>;
}
