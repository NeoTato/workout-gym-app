import type { TextFile } from './textFile.types';

export async function saveTextFile({ text, filename, mimeType }: TextFile): Promise<string> {
  const url = URL.createObjectURL(new Blob([text], { type: mimeType + ';charset=utf-8' }));
  const link = document.createElement('a'); link.href = url; link.download = filename;
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return 'Download started. Check your Downloads folder for the exported file.';
}
