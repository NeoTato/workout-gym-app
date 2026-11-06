import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import { Alert } from 'react-native';
import type { WorkoutDraft } from '../../../domain/workout';
import { getTheme } from '../../../ui/theme';
import { SavedWorkoutEditor } from '../SavedWorkoutEditor';

jest.mock('../useExerciseLibrary', () => ({ useExerciseLibrary: () => ({ items: [], loading: false, error: '', retry: jest.fn() }) }));
jest.mock('../WorkoutReferences', () => ({ PreviousExerciseSets: () => null }));
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
async function openPress() {
  if (!screen.queryByRole('button', { name: 'Edit Press, exercise 1' })) await fireEvent.press(screen.getByRole('button', { name: 'Uncategorized, 1 exercise' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Edit Press, exercise 1' }));
}


it('cancels without saving or mutating the original workout', async () => {
  const save = jest.fn(), cancel = jest.fn();
  await render(<SavedWorkoutEditor initial={initial} locations={locations} theme={getTheme('light')} save={save} cancel={cancel} />);
  await fireEvent.press(screen.getByRole('button', { name: 'Edit section: Exercises' }));
  await openPress();
  await fireEvent.changeText(screen.getByLabelText('Exercise 1 set 1 reps'), '12');
  await fireEvent.press(screen.getByRole('button', { name: 'Back to exercises' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Edit section: Session details' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Change date and time' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Start date: 2026-11-01' }));
  await fireEvent(screen.getByTestId('system-picker'), 'valueChange', {}, new Date('2026-10-31T09:00:00Z'));
  await fireEvent.press(screen.getByRole('button', { name: 'Done' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Edit section: Exercises' }));
  await openPress();
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
  await openPress();
  await fireEvent.changeText(screen.getByLabelText('Exercise 1 set 1 reps'), '');
  await fireEvent.press(screen.getByRole('button', { name: 'Save changes' }));
  expect(save).not.toHaveBeenCalled();
  expect(screen.getByRole('alert')).toHaveTextContent(/Mark each set done/);
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
  await openPress();
  expect(screen.getByLabelText('Exercise 1 set 1 reps')).toHaveDisplayValue('10');
  await fireEvent.press(screen.getByRole('button', { name: 'Save changes' }));
  expect(save).toHaveBeenCalledTimes(2);
});

it('assigns a category without clearing performed sets and only persists it on Save changes', async () => {
  const save = jest.fn().mockResolvedValue(undefined);
  await render(<SavedWorkoutEditor initial={initial} locations={locations} theme={getTheme('light')} save={save} cancel={jest.fn()} />);
  await fireEvent.press(screen.getByRole('button', { name: 'Edit section: Exercises' }));
  await openPress();
  await fireEvent.press(screen.getByRole('button', { name: 'Exercise 1 settings' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Category: Uncategorized' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Exercise category: Push' }));
  expect(screen.getByRole('checkbox', { name: 'Exercise 1 set 1 done', checked: true })).toBeOnTheScreen();
  expect(save).not.toHaveBeenCalled();
  expect(initial.exercises[0].category).toBeUndefined();
  await fireEvent.press(screen.getByRole('button', { name: 'Save changes' }));
  expect(save.mock.calls[0][0].exercises[0].category).toBe('Push');
});

it('edits one exercise at a time and retains pending values and expanded groups on return', async () => {
  const save = jest.fn().mockResolvedValue(undefined);
  const workout: WorkoutDraft = { ...initial, exercises: [
    { ...initial.exercises[0], category: 'Push', subcategory: 'Chest' },
    { ...initial.exercises[0], id: 'row', name: 'Row', category: 'Pull', subcategory: 'Back', sets: [{ id: 'row-set', weight: '40', reps: '8', completed: true }] },
  ] };
  await render(<SavedWorkoutEditor initial={workout} locations={locations} theme={getTheme('light')} save={save} cancel={jest.fn()} />);
  expect(screen.queryByLabelText('Exercise 1 set 1 reps')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Push / Chest, 1 exercise' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Edit Press, exercise 1' }));
  expect(screen.queryByLabelText('Exercise 2 set 1 reps')).toBeNull();
  await fireEvent.changeText(screen.getByLabelText('Exercise 1 set 1 reps'), '12');
  await fireEvent.press(screen.getByRole('button', { name: 'Back to exercises' }));
  expect(screen.getByRole('button', { name: 'Push / Chest, 1 exercise', expanded: true })).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'Pull / Back, 1 exercise' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Edit Row, exercise 2' }));
  expect(screen.queryByLabelText('Exercise 1 set 1 reps')).toBeNull();
  await fireEvent.changeText(screen.getByLabelText('Exercise 2 set 1 reps'), '9');
  await fireEvent.press(screen.getByRole('button', { name: 'Back to exercises' }));
  expect(save).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: 'Save changes' }));
  expect(save.mock.calls[0][0].exercises.map((exercise: WorkoutDraft['exercises'][number]) => exercise.sets[0].reps)).toEqual(['12', '9']);
  expect(workout.exercises[0].sets[0].reps).toBe('10');
});

it('opens newly added exercises directly and directs incomplete-save errors to their editor', async () => {
  const save = jest.fn().mockResolvedValue(undefined);
  await render(<SavedWorkoutEditor initial={initial} locations={locations} theme={getTheme('light')} save={save} cancel={jest.fn()} />);
  await fireEvent.press(screen.getByRole('button', { name: '+ Add exercise' }));
  const picker = within(screen.getByTestId('exercise-picker'));
  await fireEvent.changeText(picker.getByLabelText('Search exercise names'), 'New exercise');
  await fireEvent.press(picker.getByRole('button', { name: '+ Add exercise' }));
  expect(screen.getByLabelText('Exercise 2 set 1 reps')).toHaveDisplayValue('');
  await fireEvent.press(screen.getByRole('button', { name: 'Back to exercises' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Save changes' }));
  expect(save).not.toHaveBeenCalled();
  expect(screen.getByRole('header', { name: 'Edit exercise' })).toBeOnTheScreen();
  expect(screen.getByRole('alert')).toHaveTextContent(/Mark each set done/);
  await fireEvent.changeText(screen.getByLabelText('Exercise 2 set 1 load (lb)'), '20');
  await fireEvent.changeText(screen.getByLabelText('Exercise 2 set 1 reps'), '10');
  await fireEvent.press(screen.getByRole('button', { name: 'Save changes' }));
  expect(save.mock.calls[0][0].exercises).toHaveLength(2);
});

it('returns to the overview after confirmed removal while keeping it pending until Save', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined), save = jest.fn(), cancel = jest.fn();
  try {
    await render(<SavedWorkoutEditor initial={initial} locations={locations} theme={getTheme('light')} save={save} cancel={cancel} />);
    await openPress(); await fireEvent.press(screen.getByRole('button', { name: 'Exercise 1 settings' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Remove exercise 1' }));
    const remove = alert.mock.calls[0][2]!.find(action => action.text === 'Remove')!;
    await act(() => remove.onPress?.());
    expect(screen.getByText('No exercises in this workout. Add an exercise or cancel your changes.')).toBeOnTheScreen();
    expect(save).not.toHaveBeenCalled(); expect(initial.exercises).toHaveLength(1);
    await fireEvent.press(screen.getByRole('button', { name: 'Cancel changes' })); expect(cancel).toHaveBeenCalled();
  } finally { alert.mockRestore(); }
});
