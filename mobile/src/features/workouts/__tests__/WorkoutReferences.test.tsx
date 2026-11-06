import { fireEvent, render, screen } from '@testing-library/react-native';
import type { PreviousExercise } from '../../../domain/workoutReferences';
import { getTheme } from '../../../ui/theme';
import { PreviousExerciseSets, RecentSessions } from '../WorkoutReferences';
import { usePreviousExercise, useRecentSessions } from '../useWorkoutReferences';

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

it('omits empty last-time hints while still exposing read failures and retry', async () => {
  const retry = jest.fn(), context = { locationId: 'home', activityDate: '2026-11-05', startedAt: '2026-11-05T01:00:00Z', excludeSessionId: 'draft' };
  jest.mocked(usePreviousExercise).mockReturnValue({ data: null, loading: false, error: '', retry });
  const view = await render(<PreviousExerciseSets context={context} exercise={previous.exercise} theme={getTheme('light')} />);
  expect(screen.queryByText('No earlier sets for this equipment here.')).toBeNull();
  jest.mocked(usePreviousExercise).mockReturnValue({ data: null, loading: false, error: 'Storage unavailable', retry });
  await view.rerender(<PreviousExerciseSets context={context} exercise={previous.exercise} theme={getTheme('light')} />);
  expect(screen.getByRole('alert')).toHaveTextContent('Storage unavailable');
  await fireEvent.press(screen.getByRole('button', { name: 'Retry last time' })); expect(retry).toHaveBeenCalled();
});

it('keeps recent sessions compact until requested and opens the selected workout', async () => {
  const open = jest.fn();
  jest.mocked(useRecentSessions).mockReturnValue({ data: [{ id: 'saved', activityDate: '2026-11-01', sessionType: 'Push', locationName: 'Home', startedAt: '2026-11-01T01:00:00Z', endedAt: '2026-11-01T02:00:00Z', timezone: 'Asia/Manila' }], loading: false, error: '', retry: jest.fn() });
  await render(<RecentSessions context={{ locationId: 'home', activityDate: '2026-11-05', startedAt: '2026-11-05T01:00:00Z', excludeSessionId: 'draft' }} sessionType="Push" theme={getTheme('light')} open={open} />);
  expect(screen.queryByRole('button', { name: 'View previous Push workout on 2026-11-01' })).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Recent Push here' }));
  await fireEvent.press(screen.getByRole('button', { name: 'View previous Push workout on 2026-11-01' }));
  expect(open).toHaveBeenCalledWith('saved');
});
