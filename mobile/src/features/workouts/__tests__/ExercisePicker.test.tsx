import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { ExercisePicker } from '../ExercisePicker';
import { getTheme } from '../../../ui/theme';

const items = [{ id: 'press', name: 'Dumbbell press', bodyweight: false }, { id: 'crunch', name: 'Crunches', bodyweight: true }];

it('filters Push exercises by muscle group and assigns a compatible subcategory', async () => {
  const add = jest.fn();
  await render(<ExercisePicker theme={getTheme('light')} items={[
    { ...items[0], category: 'Push', subcategory: 'Chest' },
    { id: 'extension', name: 'Triceps extension', bodyweight: false, category: 'Push', subcategory: 'Triceps' },
  ]} loading={false} error="" retry={jest.fn()} cancel={jest.fn()} add={add} />);
  await fireEvent.press(screen.getByRole('button', { name: 'Filter exercises: Push' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Filter subcategory: Chest' }));
  expect(screen.queryByRole('button', { name: 'Use Triceps extension, load and reps' })).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Use Dumbbell press, load and reps' }));
  expect(screen.getByRole('button', { name: 'Subcategory: Chest' })).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: '+ Add exercise' }));
  expect(add).toHaveBeenCalledWith('Dumbbell press', expect.objectContaining({ id: 'press' }), 'Push', 'Chest');
});

it('clears the Push subcategory when changing to Pull and offers only Back and Biceps', async () => {
  const add = jest.fn();
  await render(<ExercisePicker theme={getTheme('light')} items={[{ ...items[0], category: 'Push', subcategory: 'Chest' }]} loading={false} error="" retry={jest.fn()} cancel={jest.fn()} add={add} />);
  await fireEvent.press(screen.getByRole('button', { name: 'Use Dumbbell press, load and reps' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Category: Push' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Exercise category: Pull' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Subcategory: Not assigned' }));
  expect(screen.queryByRole('button', { name: 'Exercise subcategory: Chest' })).toBeNull();
  expect(screen.getByRole('button', { name: 'Exercise subcategory: Back' })).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'Exercise subcategory: Biceps' }));
  await fireEvent.press(screen.getByRole('button', { name: '+ Add exercise' }));
  expect(add).toHaveBeenCalledWith('Dumbbell press', expect.objectContaining({ id: 'press' }), 'Pull', 'Biceps');
});

it('combines category filters with name search and allows assigning a new exercise category', async () => {
  const add = jest.fn();
  await render(<ExercisePicker theme={getTheme('light')} items={[{ ...items[0], category: 'Push' }, { ...items[1], category: 'Core' }]} loading={false} error="" retry={jest.fn()} cancel={jest.fn()} add={add} />);
  await fireEvent.press(screen.getByRole('button', { name: 'Filter exercises: Core' }));
  expect(screen.queryByRole('button', { name: 'Use Dumbbell press, load and reps' })).toBeNull();
  expect(screen.getByRole('button', { name: 'Use Crunches, bodyweight' })).toBeOnTheScreen();
  await fireEvent.changeText(screen.getByLabelText('Search exercise names'), 'plank');
  expect(screen.queryByRole('button', { name: 'Use Crunches, bodyweight' })).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Category: Uncategorized' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Exercise category: Core' }));
  await fireEvent.press(screen.getByRole('button', { name: '+ Add exercise' }));
  expect(add).toHaveBeenCalledWith('plank', undefined, 'Core', '');
});

it('searches previous exercises without case/spacing differences and preserves selected identity and mode', async () => {
  const add = jest.fn();
  await render(<ExercisePicker theme={getTheme('light')} items={items} loading={false} error="" retry={jest.fn()} cancel={jest.fn()} add={add} />);
  const picker = within(screen.getByTestId('exercise-picker'));
  await fireEvent.changeText(picker.getByLabelText('Search exercise names'), '  CRUNCH  ');
  expect(picker.queryByRole('button', { name: 'Use Dumbbell press, load and reps' })).toBeNull();
  await fireEvent.press(picker.getByRole('button', { name: 'Use Crunches, bodyweight' }));
  await fireEvent.press(picker.getByRole('button', { name: '+ Add exercise' }));
  expect(add).toHaveBeenCalledWith('Crunches', items[1], '', '');
});

it('allows a clean new name during suggestion failure and blocks empty names', async () => {
  const add = jest.fn(), retry = jest.fn(), cancel = jest.fn();
  await render(<ExercisePicker theme={getTheme('dark')} items={[]} loading={false} error="Suggestions unavailable" retry={retry} cancel={cancel} add={add} />);
  expect(screen.getByRole('button', { name: '+ Add exercise' })).toBeDisabled();
  await fireEvent.press(screen.getByRole('button', { name: 'Retry suggestions' })); expect(retry).toHaveBeenCalledTimes(1);
  await fireEvent.changeText(screen.getByLabelText('Search exercise names'), '  Zottman   curl ');
  await fireEvent.press(screen.getByRole('button', { name: '+ Add exercise' }));
  expect(add).toHaveBeenCalledWith('Zottman curl', undefined, '', '');
});

it('cancels without adding an exercise', async () => {
  const add = jest.fn(), cancel = jest.fn();
  await render(<ExercisePicker theme={getTheme('light')} items={items} loading={false} error="" retry={jest.fn()} cancel={cancel} add={add} />);
  await fireEvent.changeText(screen.getByLabelText('Search exercise names'), 'Unlogged name');
  await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
  expect(cancel).toHaveBeenCalledTimes(1); expect(add).not.toHaveBeenCalled();
});

it('retains the saved category for an exact name even when another filter is active', async () => {
  const add = jest.fn();
  await render(<ExercisePicker theme={getTheme('light')} items={[{ ...items[0], category: 'Push' }, items[1]]} loading={false} error="" retry={jest.fn()} cancel={jest.fn()} add={add} />);
  await fireEvent.press(screen.getByRole('button', { name: 'Filter exercises: Uncategorized' }));
  expect(screen.queryByRole('button', { name: 'Use Dumbbell press, load and reps' })).toBeNull();
  expect(screen.getByRole('button', { name: 'Use Crunches, bodyweight' })).toBeOnTheScreen();
  await fireEvent.changeText(screen.getByLabelText('Search exercise names'), '  DUMBBELL press  ');
  expect(screen.getByRole('button', { name: 'Category: Push' })).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: '+ Add exercise' }));
  expect(add).toHaveBeenCalledWith('Dumbbell press', expect.objectContaining({ id: 'press' }), 'Push', '');
});
