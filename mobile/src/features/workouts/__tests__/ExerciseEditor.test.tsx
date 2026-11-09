import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';
import { Alert } from 'react-native';
import type { ExerciseDraft } from '../../../domain/workout';
import { getTheme } from '../../../ui/theme';
import { ExerciseEditor } from '../ExerciseEditor';

function Editor({ weight = '35', reps = '10', bodyweight = false, logged, rest }: { weight?: string; reps?: string; bodyweight?: boolean; logged?: (label: string) => void; rest?: (label: string) => void } = {}) {
  const [exercise, update] = useState<ExerciseDraft>({ id: 'exercise', name: 'Press', equipment: '', bodyweight, unit: 'lb', convention: 'total', sets: [{ id: 'set-1', weight, reps, completed: false }] });
  let count = exercise.sets.length;
  return <ExerciseEditor exercise={exercise} index={0} theme={getTheme('light')} disabled={false} update={update} remove={() => undefined} newId={() => `set-${++count}`} onSetLogged={logged} onRest={rest} />;
}
describe('Exercise logging', () => {
  it('offers rest after logging and commits auto-rest once after editing, never per keystroke', async () => {
    const logged = jest.fn(), rest = jest.fn(); await render(<Editor weight="" reps="" logged={logged} rest={rest} />);
    await fireEvent.changeText(screen.getByLabelText('Exercise 1 set 1 load (lb)'), '35');
    await fireEvent.changeText(screen.getByLabelText('Exercise 1 set 1 reps'), '1');
    await fireEvent.changeText(screen.getByLabelText('Exercise 1 set 1 reps'), '10'); expect(logged).not.toHaveBeenCalled();
    await fireEvent(screen.getByLabelText('Exercise 1 set 1 reps'), 'blur'); expect(logged).toHaveBeenCalledTimes(1);
    await fireEvent.changeText(screen.getByLabelText('Exercise 1 set 1 reps'), '12'); await fireEvent(screen.getByLabelText('Exercise 1 set 1 reps'), 'blur'); expect(logged).toHaveBeenCalledTimes(1);
    await fireEvent.press(screen.getByRole('button', { name: '+ Add set' })); await fireEvent.press(screen.getByRole('checkbox', { name: 'Exercise 1 set 2 done' })); expect(logged).toHaveBeenCalledTimes(2);
    await fireEvent.press(screen.getByRole('button', { name: 'Rest after Press' })); expect(rest).toHaveBeenCalledWith('Press / set 2');
  });
  it('defaults a new empty exercise to distance and duration when assigned to Cardio', async () => {
    await render(<Editor weight="" reps="" />);
    await fireEvent.press(screen.getByRole('button', { name: 'Exercise 1 settings' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Category: Uncategorized' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Exercise category: Cardio' }));
    expect(screen.getByLabelText('Exercise 1 set 1 distance (km)')).toHaveDisplayValue('');
    expect(screen.getByLabelText('Exercise 1 set 1 duration (seconds)')).toHaveDisplayValue('');
    expect(screen.queryByLabelText('Exercise 1 set 1 reps')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Tracking: Duration' }));
    expect(screen.queryByLabelText('Exercise 1 set 1 distance (km)')).toBeNull();
  });
  it('tracks duration and distance with automatic completion, without rep/load inputs', async () => {
    await render(<Editor weight="" reps="" />);
    await fireEvent.press(screen.getByRole('button', { name: 'Exercise 1 settings' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Tracking: Duration' }));
    expect(screen.queryByLabelText('Exercise 1 set 1 reps')).toBeNull();
    expect(screen.getByRole('checkbox', { name: 'Exercise 1 set 1 done' })).toBeDisabled();
    await fireEvent.changeText(screen.getByLabelText('Exercise 1 set 1 duration (seconds)'), '45');
    expect(screen.getByRole('checkbox', { name: 'Exercise 1 set 1 done', checked: true })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Tracking: Distance + duration' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Clear inputs and change tracking' }));
    expect(screen.getByRole('checkbox', { name: 'Exercise 1 set 1 done' })).toBeDisabled();
    await fireEvent.changeText(screen.getByLabelText('Exercise 1 set 1 duration (seconds)'), '600');
    await fireEvent.changeText(screen.getByLabelText('Exercise 1 set 1 distance (km)'), '1.25');
    expect(screen.getByRole('checkbox', { name: 'Exercise 1 set 1 done', checked: true })).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByLabelText('Exercise 1 set 1 duration (seconds)'), '1.5');
    expect(screen.getByRole('checkbox', { name: 'Exercise 1 set 1 done', checked: false })).toBeDisabled();
  });
  it('allows more than three sets and copies values without copying completion', async () => {
    await render(<Editor />);
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Exercise 1 set 1 done' }));
    for (let i = 0; i < 4; i++) await fireEvent.press(screen.getByRole('button', { name: '+ Add set' }));
    expect(screen.getByLabelText('Exercise 1 set 5 reps')).toHaveDisplayValue('10');
    expect(screen.getByRole('checkbox', { name: 'Exercise 1 set 5 done', checked: false })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Remove set 5' }));
    expect(screen.queryByLabelText('Exercise 1 set 5 reps')).toBeNull();
  });
  it('automatically completes valid edits and clears completion for missing or invalid values', async () => {
    await render(<Editor />);
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Exercise 1 set 1 done' }));
    await fireEvent.changeText(screen.getByLabelText('Exercise 1 set 1 reps'), '12');
    expect(screen.getByRole('checkbox', { name: 'Exercise 1 set 1 done', checked: true })).toBeOnTheScreen();
    for (const reps of ['', '0', '-1', '1.5', 'Infinity', '9007199254740992']) {
      await fireEvent.changeText(screen.getByLabelText('Exercise 1 set 1 reps'), reps);
      expect(screen.getByRole('checkbox', { name: 'Exercise 1 set 1 done', checked: false })).toBeDisabled();
      await fireEvent.press(screen.getByRole('checkbox', { name: 'Exercise 1 set 1 done' }));
      expect(screen.getByRole('checkbox', { name: 'Exercise 1 set 1 done', checked: false })).toBeOnTheScreen();
    }
    await fireEvent.changeText(screen.getByLabelText('Exercise 1 set 1 reps'), '12');
    for (const weight of ['', '-2', 'Infinity', 'abc']) {
      await fireEvent.changeText(screen.getByLabelText('Exercise 1 set 1 load (lb)'), weight);
      expect(screen.getByRole('checkbox', { name: 'Exercise 1 set 1 done', checked: false })).toBeDisabled();
    }
    await fireEvent.changeText(screen.getByLabelText('Exercise 1 set 1 load (lb)'), '0');
    expect(screen.getByRole('checkbox', { name: 'Exercise 1 set 1 done', checked: true })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Exercise 1 set 1 done' }));
    expect(screen.getByRole('checkbox', { name: 'Exercise 1 set 1 done', checked: false })).toBeEnabled();
    await fireEvent.press(screen.getByRole('button', { name: 'Exercise 1 settings' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Tracking: Bodyweight reps' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Clear inputs and change tracking' }));
    expect(screen.queryByLabelText('Exercise 1 set 1 load (lb)')).toBeNull();
  });
  it('requires both fields for loaded sets but only reps for bodyweight', async () => {
    await render(<Editor weight="" reps="" />);
    expect(screen.getByRole('checkbox', { name: 'Exercise 1 set 1 done' })).toBeDisabled();
    await fireEvent.changeText(screen.getByLabelText('Exercise 1 set 1 reps'), '10');
    expect(screen.getByRole('checkbox', { name: 'Exercise 1 set 1 done', checked: false })).toBeDisabled();
    await fireEvent.changeText(screen.getByLabelText('Exercise 1 set 1 load (lb)'), '35.5');
    expect(screen.getByRole('checkbox', { name: 'Exercise 1 set 1 done', checked: true })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: '+ Add set' }));
    expect(screen.getByRole('checkbox', { name: 'Exercise 1 set 2 done', checked: false })).toBeEnabled();
    await fireEvent.changeText(screen.getByLabelText('Exercise 1 set 2 reps'), '8');
    expect(screen.getByRole('checkbox', { name: 'Exercise 1 set 2 done', checked: true })).toBeOnTheScreen();
  });
  it('automatically completes bodyweight reps without a load', async () => {
    await render(<Editor weight="" reps="" bodyweight />);
    await fireEvent.changeText(screen.getByLabelText('Exercise 1 set 1 reps'), '15');
    expect(screen.getByRole('checkbox', { name: 'Exercise 1 set 1 done', checked: true })).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByLabelText('Exercise 1 set 1 reps'), '');
    expect(screen.getByRole('checkbox', { name: 'Exercise 1 set 1 done', checked: false })).toBeDisabled();
  });
  it('retains set values when collapsing an exercise or closing its setup', async () => {
    await render(<Editor />);
    await fireEvent.changeText(screen.getByLabelText('Exercise 1 set 1 reps'), '12');
    await fireEvent.press(screen.getByRole('button', { name: 'Collapse exercise 1' }));
    expect(screen.queryByLabelText('Exercise 1 set 1 reps')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Expand exercise 1' }));
    expect(screen.getByLabelText('Exercise 1 set 1 reps')).toHaveDisplayValue('12');
    await fireEvent.press(screen.getByRole('button', { name: 'Exercise 1 settings' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Done setup' }));
    expect(screen.queryByRole('button', { name: 'Tracking: Bodyweight reps' })).toBeNull();
    expect(screen.getByRole('checkbox', { name: 'Exercise 1 set 1 done', checked: true })).toBeOnTheScreen();
  });
  it('requires confirmation before removing completed work', async () => {
    const alert = jest.spyOn(Alert, 'alert');
    try {
      await render(<Editor />);
      await fireEvent.press(screen.getByRole('checkbox', { name: 'Exercise 1 set 1 done' }));
      await fireEvent.press(screen.getByRole('button', { name: 'Remove set 1' }));
      expect(screen.getByLabelText('Exercise 1 set 1 reps')).toHaveDisplayValue('10');
      const actions = alert.mock.calls[0][2]!;
      expect(actions[0].style).toBe('cancel');
      await act(() => actions[1].onPress?.());
      expect(screen.queryByLabelText('Exercise 1 set 1 reps')).toBeNull();
    } finally { alert.mockRestore(); }
  });
});
