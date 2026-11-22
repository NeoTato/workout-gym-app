import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { openStore } from '../../../storage/openStore';
import type { WorkoutStore } from '../../../storage/workoutStore';
import { BottomNavigation } from '../BottomNavigation';
import { NavigationProvider, navigationTab, useHideBottomNavigation } from '../navigationContext';

let mockPath = '/';
jest.mock('expo-router', () => ({ router: { replace: jest.fn(), push: jest.fn() }, usePathname: () => mockPath }));
jest.mock('../../../storage/openStore', () => ({ openStore: jest.fn() }));
jest.mock('react-native-safe-area-context', () => ({ ...jest.requireActual('react-native-safe-area-context'), useSafeAreaInsets: () => ({ bottom: 24, top: 0, left: 0, right: 0 }) }));
const getDraft = jest.fn();
beforeEach(() => { jest.clearAllMocks(); mockPath = '/'; getDraft.mockResolvedValue(null); jest.mocked(openStore).mockResolvedValue({ getDraft } as unknown as WorkoutStore); });
function FocusedEditor() { useHideBottomNavigation(); return null; }
function App({ editing = false }) { return <NavigationProvider>{editing && <FocusedEditor />}<BottomNavigation /></NavigationProvider>; }
test('maps read-only pages to destinations and excludes focused entry, backup and export', () => {
  expect(navigationTab('/history/day')).toBe('history'); expect(navigationTab('/progress/exercises')).toBe('progress'); expect(navigationTab('/summary')).toBe('progress');
  expect(navigationTab('/workout')).toBeNull(); expect(navigationTab('/backup')).toBeNull(); expect(navigationTab('/export')).toBeNull();
});
test('opens destinations and protects the central workout action against duplicate presses', async () => {
  const view = await render(<App />); await waitFor(() => expect(screen.getByRole('button', { name: 'Start workout' })).toBeOnTheScreen());
  expect(screen.getByRole('tab', { name: 'Home', selected: true })).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('tab', { name: 'History' })); expect(router.replace).toHaveBeenCalledWith('/history');
  await fireEvent.press(screen.getByRole('button', { name: 'Start workout' })); await fireEvent.press(screen.getByRole('button', { name: 'Start workout' })); expect(router.push).toHaveBeenCalledTimes(1);
  mockPath = '/workout'; await view.rerender(<App />); expect(screen.queryByTestId('bottom-navigation')).toBeNull();
});
test('shows resume for an existing draft and hides navigation while an editor is mounted', async () => {
  getDraft.mockResolvedValue({ id: 'existing' }); const view = await render(<App />);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Resume workout' })).toBeOnTheScreen());
  await view.rerender(<App editing />); expect(screen.queryByTestId('bottom-navigation')).toBeNull();
  await view.rerender(<App />); await act(async () => undefined); expect(screen.getByTestId('bottom-navigation')).toBeOnTheScreen();
});
