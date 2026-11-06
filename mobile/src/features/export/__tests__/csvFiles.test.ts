import { saveCsvFile } from '../csvFiles';
import { saveTextFile } from '../saveTextFile';

jest.mock('../saveTextFile', () => ({ saveTextFile: jest.fn(async () => 'Share sheet closed.') }));

test('CSV sharing preserves bytes and supplies a generated CSV name and correct file types', async () => {
  const text = '\uFEFFheader\r\n"Café",0\r\n'; await saveCsvFile(text);
  expect(saveTextFile).toHaveBeenCalledWith({ text, filename: expect.stringMatching(/^workout-history-\d{4}-.+\.csv$/), mimeType: 'text/csv', uti: 'public.comma-separated-values-text', title: 'Save your workout history' });
});
