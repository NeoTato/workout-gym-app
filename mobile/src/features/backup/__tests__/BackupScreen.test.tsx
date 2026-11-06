import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { BackupScreen } from '../BackupScreen';
import type { BackupFiles } from '../backupFiles.types';
import type { WorkoutStore } from '../../../storage/workoutStore';
import { getTheme } from '../../../ui/theme';

const counts = { workouts: 12, exercises: 8, sets: 70, routines: 2, locations: 3, goals: 2, hasDraft: true, firstDate: '2026-10-01', lastDate: '2026-11-01' };
function setup() {
  const read = jest.fn().mockResolvedValue({ text: 'backup', fingerprint: 'sha256' }), dispose = jest.fn();
  const files: BackupFiles = { pick: jest.fn().mockResolvedValue({ name: 'journal.json', read, dispose }), save: jest.fn().mockResolvedValue('Share sheet closed. Make sure you saved a copy.') };
  const storage = { inspectBackup: jest.fn().mockResolvedValue({ token: 'review', exportedAt: '2026-11-01T10:00:00Z', appVersion: '0.1.0', appearance: 'dark', incoming: counts, current: { ...counts, workouts: 4 } }), exportBackup: jest.fn().mockResolvedValue('current-data'), restoreBackup: jest.fn().mockResolvedValue(counts) };
  const back = jest.fn(), store = async () => storage as unknown as WorkoutStore;
  return { files, storage, read, dispose, back, props: { theme: getTheme('light'), store, files, appVersion: '0.1.0', onBack: back, onHome: back } };
}
const press = async (name: string) => fireEvent.press(screen.getByRole('button', { name }));

test('picking only inspects; cancel confirmation keeps data; restore rereads and uses the inspected token', async () => {
  const state = setup(); await render(<BackupScreen {...state.props} />);
  await press('Choose backup file'); await screen.findByText('Backup preview');
  expect(state.storage.restoreBackup).not.toHaveBeenCalled();
  expect(screen.getByText('Unfinished workout: included')).toBeOnTheScreen();
  await press('Review replacement'); await press('Keep current data');
  expect(state.storage.restoreBackup).not.toHaveBeenCalled();
  await press('Back up current data first'); await screen.findByText(/Share sheet closed/);
  expect(state.storage.exportBackup).toHaveBeenCalledWith('0.1.0'); expect(state.files.save).toHaveBeenCalledWith('current-data');
  await press('Review replacement'); await press('Replace data');
  await screen.findByText('Backup restored. Your workouts, routines, goals and draft are ready.');
  expect(state.read).toHaveBeenCalledTimes(2); expect(state.storage.restoreBackup).toHaveBeenCalledWith('review', 'backup', 'sha256');
  expect(state.dispose).toHaveBeenCalledTimes(1);
  await press('View restored journal'); expect(state.back).toHaveBeenCalledTimes(1);
});

test('cancelled picker and failed validation never offer replacement', async () => {
  const state = setup(); jest.mocked(state.files.pick).mockResolvedValueOnce(null);
  await render(<BackupScreen {...state.props} />); await press('Choose backup file');
  await waitFor(() => expect(screen.getByRole('button', { name: 'Choose backup file' })).toBeEnabled());
  expect(state.storage.inspectBackup).not.toHaveBeenCalled();
  state.storage.inspectBackup.mockRejectedValueOnce(new Error('Invalid backup. No data has been changed.'));
  await press('Choose backup file'); await screen.findByText('Invalid backup. No data has been changed.');
  expect(screen.queryByRole('button', { name: 'Review replacement' })).toBeNull();
  expect(state.storage.restoreBackup).not.toHaveBeenCalled();
});

test('failed replacement requires fresh inspection and busy actions cannot trigger duplicate writes', async () => {
  const state = setup(); let reject!: (error: Error) => void;
  state.storage.restoreBackup.mockImplementationOnce(() => new Promise((_, fail) => { reject = fail; }));
  await render(<BackupScreen {...state.props} />); await press('Choose backup file'); await screen.findByText('Backup preview');
  await press('Review replacement'); await press('Replace data');
  await waitFor(() => expect(state.storage.restoreBackup).toHaveBeenCalledTimes(1));
  expect(screen.getByRole('button', { name: 'Back to Settings' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Choose backup file' })).toBeDisabled();
  await act(() => reject(new Error('The file or your local data changed. Inspect again.')));
  await screen.findByText('The file or your local data changed. Inspect again.');
  expect(screen.queryByRole('button', { name: 'Review replacement' })).toBeNull();
  await press('Inspect selected file again'); await screen.findByText('Backup preview');
  expect(state.storage.inspectBackup).toHaveBeenCalledTimes(2);
});
