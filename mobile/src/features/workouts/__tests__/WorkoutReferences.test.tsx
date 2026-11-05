import { fireEvent, render, screen } from '@testing-library/react-native';
import type { PreviousExercise } from '../../../domain/workoutReferences';
import { getTheme } from '../../../ui/theme';
import { PreviousExerciseSets } from '../WorkoutReferences';
import { usePreviousExercise } from '../useWorkoutReferences';

jest.mock('../useWorkoutReferences', () => ({ usePreviousExercise: jest.fn(), useRecentSessions: jest.fn() }));
const previous: PreviousExercise = { workoutId: 'saved', activityDate: '2026-11-01', sessionType: 'Upper', locationName: 'Home', exercise: {
  id: 'old-exercise', name: 'Press', equipment: 'Dumbbells', bodyweight: false, unit: 'lb', convention: 'per_hand', sets: [{ id: 'old-set', weight: 35, reps: 10 }],
} };

it('expands a read-only last-time reference in its recorded units without populating the current exercise', async () => {
  jest.mocked(usePreviousExercise).mockReturnValue({ data: previous, loading: false, error: '', retry: jest.fn() });
  const current = { ...previous.exercise, id: 'new-exercise', unit: 'kg' as const, sets: [{ id: 'new-set', weight: '', reps: '', completed: false }] };
  await render(<PreviousExerciseSets context={{ locationId: 'home', activityDate: '2026-11-05', startedAt: '2026-11-05T01:00:00Z', excludeSessionId: 'draft' }} exercise={current} theme={getTheme('light')} />);
  expect(screen.queryByText(/35 lbs/)).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Last time: 2026-11-01 · Upper' }));
  expect(screen.getByText('1. 35 lbs × 10 reps')).toBeOnTheScreen();
  expect(current.sets[0]).toEqual({ id: 'new-set', weight: '', reps: '', completed: false });
});
