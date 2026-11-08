import { saveTextFile } from './saveTextFile';

export function saveCsvFile(text: string): Promise<string> {
  return saveTextFile({ text, filename: `workout-history-${new Date().toISOString().replace(/[:.]/g, '-')}.csv`, mimeType: 'text/csv', uti: 'public.comma-separated-values-text', title: 'Save your workout history' });
}
