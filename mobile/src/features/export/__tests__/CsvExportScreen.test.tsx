import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { CsvExportScreen } from '../CsvExportScreen';
import { getTheme } from '../../../ui/theme';
import type { CsvExport } from '../../../domain/csvExport';

jest.mock('../../workouts/DateTimeField', () => {
  const { TextInput } = jest.requireActual('react-native');
  return { DateTimeField: ({ label, date, disabled, onChange }: { label: string; date: string; disabled: boolean; onChange: (value: string) => void }) => <TextInput accessibilityLabel={label} value={date} editable={!disabled} onChangeText={onChange} /> };
});
const result: CsvExport = { text: '\uFEFFprepared-csv\r\n', summary: { workouts: 2, sets: 8, activeDays: 1, firstDate: '2026-11-01', lastDate: '2026-11-01' } };
function setup() {
  const read = jest.fn().mockResolvedValue(result), save = jest.fn().mockResolvedValue('Download started.'), back = jest.fn();
  return { read, save, back, props: { theme: getTheme('light'), today: '2026-11-07', read, save, onBack: back } };
}
const press = (name: string) => fireEvent.press(screen.getByRole('button', { name }));

test('preview and share use the exact same snapshot and export never starts implicitly', async () => {
  const state = setup(); await render(<CsvExportScreen {...state.props} />);
  expect(screen.queryByRole('button', { name: 'Export CSV' })).toBeNull();
  await press('Preview export'); await screen.findByText('Ready to export');
  expect(state.read).toHaveBeenCalledWith({ kind: 'all' }); expect(state.save).not.toHaveBeenCalled();
  expect(screen.getByLabelText('2 workouts')).toBeOnTheScreen(); expect(screen.getByLabelText('8 completed sets')).toBeOnTheScreen();
  await press('Export CSV'); await screen.findByText('Download started.');
  expect(state.save).toHaveBeenCalledWith(result.text); expect(state.read).toHaveBeenCalledTimes(1);
});

test('date changes clear stale previews and a failed range never exposes old export data', async () => {
  const state = setup(); await render(<CsvExportScreen {...state.props} />);
  await press('Include workouts: Date range'); await press('Preview export'); await screen.findByText('Ready to export');
  expect(state.read).toHaveBeenCalledWith({ kind: 'range', from: '2026-11-01', to: '2026-11-07' });
  await fireEvent.changeText(screen.getByLabelText('To date'), '2026-10-31');
  expect(screen.queryByRole('button', { name: 'Export CSV' })).toBeNull();
  state.read.mockRejectedValueOnce(new Error('Choose an end date on or after the start date.'));
  await press('Preview export'); await screen.findByText('Choose an end date on or after the start date.');
  expect(state.save).not.toHaveBeenCalled(); expect(screen.queryByText('Ready to export')).toBeNull();
});

test('empty exports explain a header-only file before allowing an explicit download', async () => {
  const state = setup(); state.read.mockResolvedValueOnce({ text: '\uFEFFheader\r\n', summary: { workouts: 0, sets: 0, activeDays: 0, firstDate: null, lastDate: null } });
  await render(<CsvExportScreen {...state.props} />); await press('Preview export');
  await screen.findByText('No completed workouts in this range. The file will contain column headings only.');
  expect(state.save).not.toHaveBeenCalled(); await press('Export CSV'); await screen.findByText('Download started.');
  expect(state.save).toHaveBeenCalledWith('\uFEFFheader\r\n');
});

test('busy work cannot duplicate requests; failed sharing can retry the prepared snapshot', async () => {
  const state = setup(); let resolve!: (result: CsvExport) => void;
  state.read.mockImplementationOnce(() => new Promise(ready => { resolve = ready; }));
  await render(<CsvExportScreen {...state.props} />); await press('Preview export'); await press('Preview export');
  expect(state.read).toHaveBeenCalledTimes(1); expect(screen.getByRole('button', { name: 'Back to Settings' })).toBeDisabled();
  await act(() => resolve(result)); await screen.findByText('Ready to export');
  state.save.mockRejectedValueOnce(new Error('Sharing is not available.'));
  await press('Export CSV'); await screen.findByText('Sharing is not available.');
  await press('Export CSV'); await screen.findByText('Download started.');
  expect(state.read).toHaveBeenCalledTimes(1); expect(state.save).toHaveBeenCalledTimes(2);
});
