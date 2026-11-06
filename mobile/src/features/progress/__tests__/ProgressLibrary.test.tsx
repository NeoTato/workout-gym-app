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
  expect(screen.getByText('No exercises match your search or filters.')).toBeOnTheScreen();
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

it('combines category, subcategory and exercise-type filters and resets incompatible muscle groups', async () => {
  jest.mocked(useProgressLibrary).mockReturnValue({ data: [
    { id: 'press', name: 'Press', bodyweight: false, category: 'Push', subcategory: 'Chest' },
    { id: 'extension', name: 'Extension', bodyweight: false, category: 'Push', subcategory: 'Triceps' },
    { id: 'pullup', name: 'Pull up', bodyweight: true, category: 'Pull', subcategory: 'Back' },
  ], error: '', refreshing: false, retry: jest.fn() });
  await render(<ProgressLibraryRoute />);
  await fireEvent.press(screen.getByRole('button', { name: 'Filters' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Category: Push' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Subcategory: Chest' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Exercise type: Loaded' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Show 1 exercise' }));
  expect(screen.getByRole('button', { name: 'View progress for Press, loaded' })).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: 'Push / Triceps, 1 exercise' })).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Filters (3)' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Category: Pull' }));
  expect(screen.getByRole('button', { name: 'Subcategory: All', selected: true })).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'Exercise type: Bodyweight' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Show 1 exercise' }));
  expect(screen.getByRole('button', { name: 'Pull / Back, 1 exercise' })).toBeOnTheScreen();
  await fireEvent.changeText(screen.getByLabelText('Search exercise progress'), 'unknown');
  expect(screen.getByText('No exercises match your search or filters.')).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'Clear search' }));
  expect(screen.getByRole('button', { name: 'Pull / Back, 1 exercise' })).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'Clear filters' }));
  expect(screen.getByRole('button', { name: 'Push / Chest, 1 exercise' })).toBeOnTheScreen();
});

it('keeps unassigned subcategories and uncategorized exercises available through filters', async () => {
  jest.mocked(useProgressLibrary).mockReturnValue({ data: [
    { id: 'push', name: 'Unassigned press', bodyweight: false, category: 'Push', subcategory: '' },
    { id: 'legacy', name: 'Older exercise', bodyweight: false },
  ], error: '', refreshing: false, retry: jest.fn() });
  await render(<ProgressLibraryRoute />);
  await fireEvent.press(screen.getByRole('button', { name: 'Filters' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Category: Push' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Subcategory: Not assigned' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Show 1 exercise' }));
  expect(screen.getByRole('button', { name: 'View progress for Unassigned press, loaded' })).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'Filters (2)' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Category: Uncategorized' }));
  expect(screen.queryByRole('button', { name: 'Subcategory: Not assigned' })).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Show 1 exercise' }));
  expect(screen.getByRole('button', { name: 'Uncategorized, 1 exercise' })).toBeOnTheScreen();
});
