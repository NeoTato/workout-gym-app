import { fireEvent, render, screen } from '@testing-library/react-native';
import ProgressLibraryRoute from '../../../app/progress/index';
import { useProgressLibrary } from '../useExerciseProgress';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn(), canGoBack: () => true } }));
jest.mock('../useExerciseProgress', () => ({ useProgressLibrary: jest.fn() }));

it('searches completed exercise names and muscle groups without mixing loaded/bodyweight entries', async () => {
  jest.mocked(useProgressLibrary).mockReturnValue({ data: [{ id: 'press', name: 'Press', bodyweight: false, category: 'Push', subcategory: 'Chest' }, { id: 'pullup', name: 'Pull up', bodyweight: true, category: 'Pull', subcategory: 'Back' }], error: '', refreshing: false, retry: jest.fn() });
  await render(<ProgressLibraryRoute />);
  await fireEvent.changeText(screen.getByLabelText('Search exercise progress'), 'chest');
  expect(screen.getByRole('button', { name: 'View progress for Press, loaded' })).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: 'View progress for Pull up, bodyweight' })).toBeNull();
  await fireEvent.changeText(screen.getByLabelText('Search exercise progress'), 'unknown');
  expect(screen.getByText('No exercises match your search.')).toBeOnTheScreen();
});

it('distinguishes storage failure from an empty exercise library', async () => {
  const retry = jest.fn();
  jest.mocked(useProgressLibrary).mockReturnValue({ data: null, error: 'Storage failed', refreshing: false, retry });
  const view = await render(<ProgressLibraryRoute />);
  expect(screen.queryByText('No completed exercises yet. Finish a workout to start your history.')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Retry exercises' })); expect(retry).toHaveBeenCalled();
  jest.mocked(useProgressLibrary).mockReturnValue({ data: [], error: '', refreshing: false, retry });
  await view.rerender(<ProgressLibraryRoute />);
  expect(screen.getByText('No completed exercises yet. Finish a workout to start your history.')).toBeOnTheScreen();
});
