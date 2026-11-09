import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Button } from 'react-native';
import type { RestState } from '../../../domain/restTimer';
import { openStore } from '../../../storage/openStore';
import type { WorkoutStore } from '../../../storage/workoutStore';
import { RestTimerProvider } from '../RestTimerProvider';
import { RestTimerDock, RestTimerDialog } from '../RestTimerControls';
import { useRestTimer } from '../restContext';
import { restNotifications } from '../restNotifications';

jest.mock('expo-router', () => ({ usePathname: () => '/workout' }));
const mockPreviewPlayer = { play: jest.fn(), pause: jest.fn(), loop: false };
jest.mock('expo-audio', () => ({ useAudioPlayer: () => mockPreviewPlayer, setAudioModeAsync: async () => undefined }));
jest.mock('expo-crypto', () => ({ randomUUID: () => 'timer-id' }));
jest.mock('../../../storage/openStore', () => ({ openStore: jest.fn() }));
jest.mock('../restNotifications', () => ({ restNotifications: { available: true, enable: jest.fn(), sync: jest.fn() } }));
let saved: RestState | null;
const save = jest.fn(async (value: RestState) => { saved = value; return true; });
function Controls() {
  const rest = useRestTimer();
  return <><Button title="Open timer" onPress={() => rest.open('Press / set 1')} /><Button title="Reload timer" onPress={rest.reload} /><RestTimerDialog /><RestTimerDock /></>;
}
beforeEach(() => {
  mockPreviewPlayer.play.mockClear(); mockPreviewPlayer.pause.mockClear();
  saved = null; save.mockClear(); jest.useFakeTimers({ now: 100000 });
  jest.mocked(restNotifications.enable).mockReset().mockResolvedValue(true); jest.mocked(restNotifications.sync).mockReset().mockResolvedValue(undefined);
  jest.mocked(openStore).mockResolvedValue({ getDraft: async () => ({ id: 'workout' }), getRestTimerEpoch: async () => 0, getRestTimer: async () => saved, saveRestTimer: save } as unknown as WorkoutStore);
});
afterEach(() => jest.useRealTimers());
async function show() {
  await render(<RestTimerProvider><Controls /></RestTimerProvider>);
  await fireEvent.press(screen.getByRole('button', { name: 'Open timer' }));
  await waitFor(() => expect(screen.getByRole('header', { name: 'Rest timer' })).toBeOnTheScreen());
}

test('sound choice previews once, stops on selection change and closes cleanly', async () => {
  await show();
  await fireEvent.press(screen.getByRole('button', { name: 'Alarm sound: Gentle chime' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Preview sound' }));
  expect(mockPreviewPlayer.play).toHaveBeenCalledTimes(1); expect(mockPreviewPlayer.loop).toBe(false);
  await fireEvent.press(screen.getByRole('button', { name: 'Alarm sound: Ringing' }));
  expect(mockPreviewPlayer.pause).toHaveBeenCalled(); expect(screen.getByRole('button', { name: 'Preview sound' })).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'Preview sound' }));
  await act(async () => { jest.advanceTimersByTime(2200); });
  expect(screen.getByRole('button', { name: 'Preview sound' })).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'Preview sound' }));
  mockPreviewPlayer.pause.mockClear(); await fireEvent.press(screen.getByRole('button', { name: 'Close timer' }));
  expect(mockPreviewPlayer.pause).toHaveBeenCalled();
});
test('manual start validates input; pause, extend, resume and end retain the correct countdown', async () => {
  await show(); expect(restNotifications.enable).not.toHaveBeenCalled();
  await fireEvent.changeText(screen.getByLabelText('Rest minutes'), '0'); await fireEvent.changeText(screen.getByLabelText('Rest seconds'), '0');
  await fireEvent.press(screen.getByRole('button', { name: 'Start rest' })); expect(screen.getByRole('alert')).toHaveTextContent(/Choose 1 second/); expect(saved!.timer).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Quick rest: 1:30' })); await fireEvent.press(screen.getByRole('button', { name: 'Start rest' }));
  await waitFor(() => expect(screen.getByText('Resting')).toBeOnTheScreen());
  await fireEvent.press(screen.getByRole('button', { name: 'Pause' })); await waitFor(() => expect(screen.getByText('Rest paused')).toBeOnTheScreen());
  const remainder = saved!.timer!.remainingMs; await act(async () => { jest.advanceTimersByTime(10000); }); expect(saved!.timer!.remainingMs).toBe(remainder);
  await fireEvent.press(screen.getByRole('button', { name: '+30 sec' })); await waitFor(() => expect(saved!.timer!.remainingMs).toBe(remainder + 30000));
  await fireEvent.press(screen.getByRole('button', { name: 'Resume' })); await waitFor(() => expect(screen.getByText('Resting')).toBeOnTheScreen());
  await fireEvent.press(screen.getByRole('button', { name: 'End rest' })); await waitFor(() => expect(saved!.timer).toBeNull());
  expect(screen.queryByText('Resting')).toBeNull();
});
test('notification denial does not block the visual timer or silently enable reminders', async () => {
  jest.mocked(restNotifications.enable).mockResolvedValue(false); await show();
  await fireEvent.press(screen.getByLabelText('Notify when rest ends'));
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/Notifications are off/));
  expect(saved?.reminders ?? false).toBe(false);
  await fireEvent.press(screen.getByRole('button', { name: 'Reload timer' })); await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
  await fireEvent.press(screen.getByRole('button', { name: 'Start rest' })); await waitFor(() => expect(screen.getByText('Resting')).toBeOnTheScreen());
});
test('failed timer writes retain the form and can be retried; reload clears state after workout completion', async () => {
  await show(); save.mockRejectedValueOnce(new Error('disk unavailable'));
  await fireEvent.press(screen.getByRole('button', { name: 'Start rest' })); await waitFor(() => expect(screen.getAllByRole('alert')[0]).toHaveTextContent(/Unable to save/));
  expect(saved!.timer).toBeNull(); await fireEvent.press(screen.getByRole('button', { name: 'Start rest' })); await waitFor(() => expect(screen.getByText('Resting')).toBeOnTheScreen());
  saved = null; await fireEvent.press(screen.getByRole('button', { name: 'Reload timer' })); await waitFor(() => expect(screen.queryByText('Resting')).toBeNull());
  expect(restNotifications.sync).toHaveBeenLastCalledWith(null);
});
