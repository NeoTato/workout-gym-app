import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as ReactNative from 'react-native';
import { AppearanceProvider } from '../AppearanceProvider';
import { useAppearance } from '../appearanceContext';
import { getTheme } from '../theme';
import type { WorkoutStore } from '../../storage/workoutStore';

jest.mock('../../storage/openStore', () => ({ openStore: jest.fn() }));
function Probe() {
  const appearance = useAppearance();
  return <ReactNative.View testID="appearance" style={{ backgroundColor: appearance.theme.background }}>
    <ReactNative.Text>{appearance.ready ? appearance.preference : 'loading'}</ReactNative.Text>
    <ReactNative.Text>{appearance.error}</ReactNative.Text>
    <ReactNative.Button title="Dark" onPress={() => { void appearance.change('dark'); }} />
    <ReactNative.Button title="Reload" onPress={() => { void appearance.reload(); }} />
  </ReactNative.View>;
}
const storage = () => ({ getAppearance: jest.fn().mockResolvedValue('system'), setAppearance: jest.fn().mockResolvedValue(undefined) });

test('System reacts to device changes, explicit Dark overrides it, and reload applies restored settings', async () => {
  const scheme = jest.spyOn(ReactNative, 'useColorScheme').mockReturnValue('light'), db = storage();
  const store = async () => db as unknown as WorkoutStore;
  try {
    const view = await render(<AppearanceProvider store={store}><Probe /></AppearanceProvider>);
    await screen.findByText('system'); expect(screen.getByTestId('appearance')).toHaveStyle({ backgroundColor: getTheme('light').background });
    scheme.mockReturnValue('dark'); await view.rerender(<AppearanceProvider store={store}><Probe /></AppearanceProvider>);
    expect(screen.getByTestId('appearance')).toHaveStyle({ backgroundColor: getTheme('dark').background });
    await fireEvent.press(screen.getByText('Dark')); await screen.findByText('dark'); expect(db.setAppearance).toHaveBeenCalledWith('dark');
    scheme.mockReturnValue('light'); await view.rerender(<AppearanceProvider store={store}><Probe /></AppearanceProvider>);
    expect(screen.getByTestId('appearance')).toHaveStyle({ backgroundColor: getTheme('dark').background });
    db.getAppearance.mockResolvedValue('light'); await fireEvent.press(screen.getByText('Reload')); await screen.findByText('light');
    expect(screen.getByTestId('appearance')).toHaveStyle({ backgroundColor: getTheme('light').background });
  } finally { scheme.mockRestore(); }
});

test('a failed save retains the previous theme and exposes a retryable error', async () => {
  const db = storage(); db.getAppearance.mockResolvedValue('light'); db.setAppearance.mockRejectedValue(new Error('Disk full'));
  await render(<AppearanceProvider store={async () => db as unknown as WorkoutStore}><Probe /></AppearanceProvider>);
  await screen.findByText('light'); await fireEvent.press(screen.getByText('Dark'));
  await waitFor(() => expect(screen.getByText(/previous choice is still active/)).toBeOnTheScreen());
  expect(screen.getByText('light')).toBeOnTheScreen(); expect(screen.getByTestId('appearance')).toHaveStyle({ backgroundColor: getTheme('light').background });
});
