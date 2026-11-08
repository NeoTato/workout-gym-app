import { router } from 'expo-router';
import { localDate } from '../domain/workout';
import { CsvExportScreen } from '../features/export/CsvExportScreen';
import { saveCsvFile } from '../features/export/csvFiles';
import { openStore } from '../storage/openStore';
import { useAppTheme } from '../ui/appearanceContext';

export default function CsvExportRoute() {
  return <CsvExportScreen theme={useAppTheme()} today={localDate(new Date())} read={async selection => (await openStore()).getCsvExport(selection)} save={saveCsvFile}
    onBack={() => { if (router.canGoBack()) router.back(); else router.replace('/settings'); }} />;
}
