import { fireEvent, render, screen } from '@testing-library/react-native';
import { buildExerciseProgress, type ProgressRow } from '../../../domain/exerciseProgress';
import { getTheme } from '../../../ui/theme';
import { ExerciseProgressScreen } from '../ExerciseProgressScreen';

const row: ProgressRow = { exerciseId: 'press', exerciseName: 'Press', variationId: 'home', locationId: 'home', locationName: 'Home', archived: 0, equipment: 'Dumbbells', bodyweight: 0, dimension: 'mass', convention: 'per_hand', workoutId: 'workout', activityDate: '2026-11-01', startedAt: '2026-11-01T01:00:00Z', sessionType: 'Push', setId: 'set', weight: 100, reps: 8, unit: 'lb' };

it('converts chart units, preserves original sets, and changes equipment explicitly', async () => {
  const openWorkout = jest.fn();
  const variations = buildExerciseProgress([row, { ...row, variationId: 'gym', locationId: 'gym', locationName: 'Gym B', archived: 1, workoutId: 'other', setId: 'other-set', weight: 20, unit: 'kg' }]);
  await render(<ExerciseProgressScreen name="Press" variations={variations} theme={getTheme('light')} back={jest.fn()} openWorkout={openWorkout} />);
  expect(screen.queryByText('Set 1: 100 lb × 8 reps')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Chart unit: kg' }));
  expect(screen.getByText('45.36 kg')).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: '2026-11-01, Push, 1 set' }));
  expect(screen.getByText('Set 1: 100 lb × 8 reps')).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'Open workout' })); expect(openWorkout).toHaveBeenCalledWith('workout');
  await fireEvent.press(screen.getByRole('button', { name: 'Change equipment' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Compare Gym B / Dumbbells / lb / kg, per hand / removed location' }));
  expect(screen.getByText('20 kg')).toBeOnTheScreen();
  expect(screen.queryByText('Set 1: 100 lb × 8 reps')).toBeNull();
});

it('shows bodyweight reps, limits initial history, and handles empty completed history', async () => {
  const rows = Array.from({ length: 13 }, (_, index) => ({ ...row, variationId: 'bodyweight', bodyweight: 1, dimension: 'bodyweight' as const, weight: null, reps: index + 1, workoutId: `workout-${index}`, setId: `set-${index}`, activityDate: `2026-10-${String(index + 1).padStart(2, '0')}` }));
  const view = await render(<ExerciseProgressScreen name="Pull up" variations={buildExerciseProgress(rows)} theme={getTheme('dark')} back={jest.fn()} openWorkout={jest.fn()} />);
  expect(screen.getByText('13 reps')).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: 'Chart unit: kg' })).toBeNull();
  expect(screen.queryByRole('button', { name: '2026-10-01, Push, 1 set' })).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Show 10 more sessions' }));
  expect(screen.getByRole('button', { name: '2026-10-01, Push, 1 set' })).toBeOnTheScreen();
  await view.rerender(<ExerciseProgressScreen name="Pull up" variations={[]} theme={getTheme('dark')} back={jest.fn()} openWorkout={jest.fn()} />);
  expect(screen.getByText('No completed sets remain for this exercise.')).toBeOnTheScreen();
});
