import { fireEvent, render, screen } from '@testing-library/react-native';
import type { CompletedExercise } from '../../../domain/workout';
import { getTheme } from '../../../ui/theme';
import { CompletedExerciseSummary } from '../CompletedExerciseSummary';

const exercise: CompletedExercise = { id: 'press', name: 'Dumbbell press', equipment: 'Dumbbells', bodyweight: false,
  unit: 'lb', convention: 'per_hand', sets: [{ id: 'one', weight: 35, reps: 10 }, { id: 'two', weight: 40, reps: 8 }] };

it('starts compact and independently expands and collapses each exercise without changing saved sets', async () => {
  const core: CompletedExercise = { ...exercise, id: 'core', name: 'Crunches', bodyweight: true, sets: [{ id: 'core-set', weight: null, reps: 15 }] };
  await render(<><CompletedExerciseSummary exercise={exercise} theme={getTheme('light')} /><CompletedExerciseSummary exercise={core} theme={getTheme('light')} /></>);
  expect(screen.getByRole('button', { name: 'Dumbbell press, 2 sets', expanded: false })).toBeOnTheScreen();
  expect(screen.queryByText(/Set 1:/)).toBeNull();
  expect(screen.queryByText('Dumbbells')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Dumbbell press, 2 sets' }));
  expect(screen.getByRole('button', { name: 'Dumbbell press, 2 sets', expanded: true })).toBeOnTheScreen();
  expect(screen.getByText('Set 1: 35 lbs × 10 reps')).toBeOnTheScreen();
  expect(screen.getByText('Set 2: 40 lbs × 8 reps')).toBeOnTheScreen();
  expect(screen.queryByText(/Bodyweight/)).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Crunches, 1 set' }));
  expect(screen.getByText('Set 1: Bodyweight × 15 reps')).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'Dumbbell press, 2 sets' }));
  expect(screen.queryByText('Set 1: 35 lbs × 10 reps')).toBeNull();
  expect(screen.getByText('Set 1: Bodyweight × 15 reps')).toBeOnTheScreen();
  expect(exercise.sets[0].weight).toBe(35);
});
