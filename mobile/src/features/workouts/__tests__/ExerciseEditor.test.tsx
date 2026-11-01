import { fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';
import type { ExerciseDraft } from '../../../domain/workout';
import { getTheme } from '../../../ui/theme';
import { ExerciseEditor } from '../ExerciseEditor';

function Editor() {
  const [exercise, update] = useState<ExerciseDraft>({ id: 'exercise', name: 'Press', equipment: '', bodyweight: false, unit: 'lb', convention: 'total', sets: [{ id: 'set-1', weight: '35', reps: '10', completed: false }] });
  let count = exercise.sets.length;
  return <ExerciseEditor exercise={exercise} index={0} theme={getTheme('light')} disabled={false} update={update} remove={() => undefined} newId={() => `set-${++count}`} />;
}
describe('Exercise logging', () => {
  it('allows more than three sets and copies values without copying completion', async () => {
    await render(<Editor />);
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Exercise 1 set 1 done' }));
    for (let i = 0; i < 4; i++) await fireEvent.press(screen.getByRole('button', { name: '+ Add set' }));
    expect(screen.getByLabelText('Exercise 1 set 5 reps')).toHaveDisplayValue('10');
    expect(screen.getByRole('checkbox', { name: 'Exercise 1 set 5 done', checked: false })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Remove set 5' }));
    expect(screen.queryByLabelText('Exercise 1 set 5 reps')).toBeNull();
  });
  it('requires reconfirmation after editing a completed set', async () => {
    await render(<Editor />);
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Exercise 1 set 1 done' }));
    await fireEvent.changeText(screen.getByLabelText('Exercise 1 set 1 reps'), '12');
    expect(screen.getByRole('checkbox', { name: 'Exercise 1 set 1 done', checked: false })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Tracking: Bodyweight reps' }));
    expect(screen.queryByLabelText('Exercise 1 set 1 load (lb)')).toBeNull();
  });
});
