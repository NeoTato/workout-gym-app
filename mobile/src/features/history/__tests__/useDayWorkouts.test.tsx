import { act, renderHook, waitFor } from '@testing-library/react-native';
import { openStore } from '../../../storage/openStore';
import type { WorkoutStore } from '../../../storage/workoutStore';
import type { SavedWorkout } from '../../../domain/workout';
import { useDayWorkouts } from '../useDayWorkouts';

jest.mock('expo-router', () => ({ useFocusEffect: (callback: () => void) => {
  const React = jest.requireActual('react'); React.useEffect(callback, [callback]);
} }));
jest.mock('../../../storage/openStore', () => ({ openStore: jest.fn() }));

it('does not show a late response for a previously selected day', async () => {
  let resolveFirst: (value: SavedWorkout[]) => void = () => { throw new Error('Query not started'); };
  const getDayWorkouts = jest.fn().mockImplementationOnce(() => new Promise<SavedWorkout[]>(resolve => { resolveFirst = resolve; })).mockResolvedValue([]);
  const store: Pick<WorkoutStore, 'getDayWorkouts'> = { getDayWorkouts };
  jest.mocked(openStore).mockResolvedValue(store as WorkoutStore);
  const view = await renderHook<ReturnType<typeof useDayWorkouts>, { date: string }>(({ date }) => useDayWorkouts(date, 'all'), { initialProps: { date: '2026-11-04' } });
  await waitFor(() => expect(getDayWorkouts).toHaveBeenCalledTimes(1));
  await view.rerender({ date: '2026-11-05' });
  await waitFor(() => expect(view.result.current.workouts).toEqual([]));
  await act(async () => { resolveFirst([{ id: 'old', activityDate: '2026-11-04', sessionType: 'Push', locationName: 'Gym A', timezone: 'Asia/Manila', startedAt: '2026-11-04T01:00:00Z', endedAt: '2026-11-04T02:00:00Z', exercises: [] }]); });
  expect(view.result.current.workouts).toEqual([]);
});
