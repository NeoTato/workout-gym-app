import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { AppState, Vibration } from 'react-native';
import { RestAlarm } from '../RestAlarm';
import { useRestTimer, type RestContextValue } from '../restContext';

const mockPlayer = { play: jest.fn(), pause: jest.fn(), loop: false };
jest.mock('expo-audio', () => ({ useAudioPlayer: () => mockPlayer, setAudioModeAsync: async () => undefined }));
jest.mock('../restContext', () => ({ useRestTimer: jest.fn() }));
let rest: RestContextValue;
beforeEach(() => {
  jest.useFakeTimers({ now: 100000 }); jest.clearAllMocks();
  Object.defineProperty(AppState, 'currentState', { configurable: true, value: 'active' });
  jest.spyOn(Vibration, 'vibrate').mockImplementation(() => undefined); jest.spyOn(Vibration, 'cancel').mockImplementation(() => undefined);
  rest = { alarmEnabled: true, setAlarmEnabled: jest.fn(), state: { workoutId: 'workout', epoch: 0, seconds: 1, autoStart: false, reminders: false, timer: { id: 'timer', label: 'Press / set 1', endsAt: 101000, remainingMs: 1000 } }, busy: false, error: '', visible: false, label: '', remindersAvailable: true, open: jest.fn(), close: jest.fn(), reload: jest.fn(), start: jest.fn(), autoStart: jest.fn(), quickStart: jest.fn(), change: jest.fn(), preference: jest.fn() };
  jest.mocked(useRestTimer).mockImplementation(() => rest);
});
afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks(); });
test('rings at deadline and Stop immediately silences and clears the timer', async () => {
  await render(<RestAlarm />);
  expect(mockPlayer.play).not.toHaveBeenCalled();
  await act(async () => { jest.advanceTimersByTime(1000); });
  expect(screen.getByText('Rest complete')).toBeOnTheScreen(); expect(mockPlayer.play).toHaveBeenCalled(); expect(mockPlayer.loop).toBe(true);
  await fireEvent.press(screen.getByRole('button', { name: 'Stop alarm' }));
  expect(mockPlayer.pause).toHaveBeenCalled(); expect(Vibration.cancel).toHaveBeenCalled(); expect(rest.change).toHaveBeenCalledWith('end'); expect(screen.queryByText('Rest complete')).toBeNull();
});
test('snooze silences immediately and requests thirty more seconds', async () => {
  await render(<RestAlarm />); await act(async () => { jest.advanceTimersByTime(1000); });
  await fireEvent.press(screen.getByRole('button', { name: 'Rest 30 sec more' }));
  expect(rest.change).toHaveBeenCalledWith('extend'); expect(mockPlayer.pause).toHaveBeenCalled(); expect(screen.queryByText('Rest complete')).toBeNull();
});
test('disabled and already expired timers never ring on mounting', async () => {
  rest.alarmEnabled = false; const view = await render(<RestAlarm />);
  await act(async () => { jest.advanceTimersByTime(2000); }); expect(mockPlayer.play).not.toHaveBeenCalled();
  rest.alarmEnabled = true; await view.rerender(<RestAlarm />);
  await act(async () => { jest.advanceTimersByTime(2000); }); expect(mockPlayer.play).not.toHaveBeenCalled();
});
test('backgrounding silences an alarm and returning does not replay it', async () => {
  const listener = jest.spyOn(AppState, 'addEventListener');
  await render(<RestAlarm />); await act(async () => { jest.advanceTimersByTime(1000); });
  expect(mockPlayer.play).toHaveBeenCalledTimes(1);
  const change = listener.mock.calls.find(([event]) => event === 'change')![1];
  await act(async () => { change('background'); });
  expect(mockPlayer.pause).toHaveBeenCalled(); expect(screen.queryByText('Rest complete')).toBeNull();
  await act(async () => { change('active'); jest.advanceTimersByTime(1000); });
  expect(mockPlayer.play).toHaveBeenCalledTimes(1); expect(screen.queryByText('Rest complete')).toBeNull();
});
