import { router } from 'expo-router';
import { SettingsScreen } from '../features/settings/SettingsScreen';
import { useAppearance } from '../ui/appearanceContext';

export default function SettingsRoute() {
  const appearance = useAppearance();
  return <SettingsScreen theme={appearance.theme} appearance={appearance} onBackup={() => router.push('/backup')} onExport={() => router.push('/export')} />;
}
