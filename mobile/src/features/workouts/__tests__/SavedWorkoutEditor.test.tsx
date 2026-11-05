import { fireEvent, render, screen } from '@testing-library/react-native';
import type { WorkoutDraft } from '../../../domain/workout';
import { getTheme } from '../../../ui/theme';
import { SavedWorkoutEditor } from '../SavedWorkoutEditor';

jest.mock('../useExerciseLibrary', () => ({ useExerciseLibrary: () => ({ items: [], loading: false, error: '', retry: jest.fn() }) }));
jest.mock('expo-crypto', () => ({ randomUUID: () => 'new-id' }));
jest.mock('@react-native-community/datetimepicker', () => {
  const { View } = jest.requireActual('react-native');
  return { __esModule: true, default: (props: object) => <View {...props} testID="system-picker" /> };
});
const initial: WorkoutDraft = {
  id: 'saved', startedAt: '2026-11-01T01:00:00Z', activityDate: '2026-11-01', timezone: 'Asia/Manila',
  locationId: 'home', sessionType: 'Push', exercises: [{ id: 'exercise', name: 'Press', equipment: 'Dumbbells',
    bodyweight: false, unit: 'lb', convention: 'per_hand', sets: [{ id: 'set', weight: '35', reps: '10', completed: true }] }],
};
const locations = [{ id: 'home', name: 'Home', kind: 'home' as const }];

it('cancels without saving or mutating the original workout', async () => {
  const save = jest.fn(), cancel = jest.fn();
  await render(<SavedWorkoutEditor initial={initial} locations={locations} theme={getTheme('light')} save={save} cancel={cancel} />);
  await fireEvent.press(screen.getByRole('button', { name: 'Edit section: Exercises' }));
  await fireEvent.changeText(screen.getByLabelText('Exercise 1 set 1 reps'), '12');
  await fireEvent.press(screen.getByRole('button', { name: 'Edit section: Session details' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Change date and time' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Start date: 2026-11-01' }));
  await fireEvent(screen.getByTestId('system-picker'), 'valueChange', {}, new Date('2026-10-31T09:00:00Z'));
  await fireEvent.press(screen.getByRole('button', { name: 'Done' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Edit section: Exercises' }));
  expect(screen.getByLabelText('Exercise 1 set 1 reps')).toHaveDisplayValue('12');
  await fireEvent.press(screen.getByRole('button', { name: 'Cancel changes' }));
  expect(save).not.toHaveBeenCalled(); expect(cancel).toHaveBeenCalledTimes(1);
  expect(initial.exercises[0].sets[0].reps).toBe('10');
  expect(initial.timing).toBeUndefined();
});

it('blocks missing measurements and automatically completes corrected values before saving', async () => {
  const save = jest.fn().mockResolvedValue(undefined);
  await render(<SavedWorkoutEditor initial={initial} locations={locations} theme={getTheme('dark')} save={save} cancel={() => undefined} />);
  await fireEvent.press(screen.getByRole('button', { name: 'Edit section: Exercises' }));
  await fireEvent.changeText(screen.getByLabelText('Exercise 1 set 1 reps'), '');
  await fireEvent.press(screen.getByRole('button', { name: 'Save changes' }));
  expect(save).not.toHaveBeenCalled();
  expect(screen.getByRole('alert')).toHaveTextContent(/Mark each set done/);
  await fireEvent.press(screen.getByRole('button', { name: 'Edit section: Exercises' }));
  await fireEvent.changeText(screen.getByLabelText('Exercise 1 set 1 reps'), '12');
  await fireEvent.press(screen.getByRole('button', { name: 'Save changes' }));
  expect(save.mock.calls[0][0].exercises[0].sets[0]).toMatchObject({ reps: '12', completed: true });
});

it('retains edits and allows retry after a failed save', async () => {
  const save = jest.fn().mockRejectedValueOnce(new Error('Disk unavailable')).mockResolvedValue(undefined);
  await render(<SavedWorkoutEditor initial={initial} locations={locations} theme={getTheme('light')} save={save} cancel={() => undefined} />);
  await fireEvent.press(screen.getByRole('button', { name: 'Save changes' }));
  expect(screen.getByRole('alert')).toHaveTextContent(/Your original workout is unchanged/);
  await fireEvent.press(screen.getByRole('button', { name: 'Edit section: Exercises' }));
  expect(screen.getByLabelText('Exercise 1 set 1 reps')).toHaveDisplayValue('10');
  await fireEvent.press(screen.getByRole('button', { name: 'Save changes' }));
  expect(save).toHaveBeenCalledTimes(2);
});

it('assigns a category without clearing performed sets and only persists it on Save changes', async () => {
  const save = jest.fn().mockResolvedValue(undefined);
  await render(<SavedWorkoutEditor initial={initial} locations={locations} theme={getTheme('light')} save={save} cancel={jest.fn()} />);
  await fireEvent.press(screen.getByRole('button', { name: 'Edit section: Exercises' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Exercise 1 settings' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Category: Uncategorized' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Exercise category: Push' }));
  expect(screen.getByRole('checkbox', { name: 'Exercise 1 set 1 done', checked: true })).toBeOnTheScreen();
  expect(save).not.toHaveBeenCalled();
  expect(initial.exercises[0].category).toBeUndefined();
  await fireEvent.press(screen.getByRole('button', { name: 'Save changes' }));
  expect(save.mock.calls[0][0].exercises[0].category).toBe('Push');
});
