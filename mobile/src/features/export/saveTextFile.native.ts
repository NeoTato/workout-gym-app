import { Directory, File, Paths } from 'expo-file-system';
import { isAvailableAsync, shareAsync } from 'expo-sharing';
import type { TextFile } from './textFile.types';

export async function saveTextFile({ text, filename, mimeType, uti, title }: TextFile): Promise<string> {
  if (!await isAvailableAsync()) throw new Error('Sharing is not available on this device. Try again on a device with a share destination.');
  const folder = new Directory(Paths.cache, 'workout-exports'); folder.create({ idempotent: true });
  const file = new File(folder, filename); file.create(); file.write(text);
  await shareAsync(file.uri, { mimeType, UTI: uti, dialogTitle: title });
  return 'Share sheet closed. Make sure you saved a copy to Files or another destination.';
}
