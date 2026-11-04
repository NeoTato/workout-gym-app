import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { ExercisePicker } from '../ExercisePicker';
import { getTheme } from '../../../ui/theme';

const items = [{ id: 'press', name: 'Dumbbell press', bodyweight: false }, { id: 'crunch', name: 'Crunches', bodyweight: true }];

it('searches previous exercises without case/spacing differences and preserves selected identity and mode', async () => {
  const add = jest.fn();
  await render(<ExercisePicker theme={getTheme('light')} items={items} loading={false} error="" retry={jest.fn()} cancel={jest.fn()} add={add} />);
  const picker = within(screen.getByTestId('exercise-picker'));
  await fireEvent.changeText(picker.getByLabelText('Search exercise names'), '  CRUNCH  ');
  expect(picker.queryByRole('button', { name: 'Use Dumbbell press, load and reps' })).toBeNull();
  await fireEvent.press(picker.getByRole('button', { name: 'Use Crunches, bodyweight' }));
  await fireEvent.press(picker.getByRole('button', { name: '+ Add exercise' }));
  expect(add).toHaveBeenCalledWith('Crunches', items[1]);
});

it('allows a clean new name during suggestion failure and blocks empty names', async () => {
  const add = jest.fn(), retry = jest.fn(), cancel = jest.fn();
  await render(<ExercisePicker theme={getTheme('dark')} items={[]} loading={false} error="Suggestions unavailable" retry={retry} cancel={cancel} add={add} />);
  expect(screen.getByRole('button', { name: '+ Add exercise' })).toBeDisabled();
  await fireEvent.press(screen.getByRole('button', { name: 'Retry suggestions' })); expect(retry).toHaveBeenCalledTimes(1);
  await fireEvent.changeText(screen.getByLabelText('Search exercise names'), '  Zottman   curl ');
  await fireEvent.press(screen.getByRole('button', { name: '+ Add exercise' }));
  expect(add).toHaveBeenCalledWith('Zottman curl', undefined);
});

it('cancels without adding an exercise', async () => {
  const add = jest.fn(), cancel = jest.fn();
  await render(<ExercisePicker theme={getTheme('light')} items={items} loading={false} error="" retry={jest.fn()} cancel={cancel} add={add} />);
  await fireEvent.changeText(screen.getByLabelText('Search exercise names'), 'Unlogged name');
  await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
  expect(cancel).toHaveBeenCalledTimes(1); expect(add).not.toHaveBeenCalled();
});
