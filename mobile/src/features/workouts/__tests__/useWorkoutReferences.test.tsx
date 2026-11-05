import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { PreviousExercise, ReferenceExercise } from '../../../domain/workoutReferences';
import { openStore } from '../../../storage/openStore';
import type { WorkoutStore } from '../../../storage/workoutStore';
import { usePreviousExercise, useRecentSessions } from '../useWorkoutReferences';

jest.mock('expo-router', () => ({ useFocusEffect: (callback: () => void) => {
  const React = jest.requireActual('react'); React.useEffect(callback, [callback]);
} }));
jest.mock('../../../storage/openStore', () => ({ openStore: jest.fn() }));
const context = { locationId: 'home', activityDate: '2026-11-05', startedAt: '2026-11-05T01:00:00Z', excludeSessionId: 'draft' };
const exercise: ReferenceExercise = { name: 'Press', equipment: 'Machine A', bodyweight: false, unit: 'lb', convention: 'total' };

it('ignores late results from old equipment and does not refetch when the same identity rerenders', async () => {
  let resolveFirst: (value: PreviousExercise | null) => void = () => { throw new Error('Query not started'); };
  const getPreviousExercise = jest.fn().mockImplementationOnce(() => new Promise<PreviousExercise | null>(resolve => { resolveFirst = resolve; })).mockResolvedValue(null);
  const store: Pick<WorkoutStore, 'getPreviousExercise'> = { getPreviousExercise };
  jest.mocked(openStore).mockResolvedValue(store as WorkoutStore);
  const view = await renderHook<ReturnType<typeof usePreviousExercise>, { item: ReferenceExercise }>(({ item }) => usePreviousExercise(context, item), { initialProps: { item: exercise } });
  await waitFor(() => expect(getPreviousExercise).toHaveBeenCalledTimes(1));
  await view.rerender({ item: { ...exercise } });
  expect(getPreviousExercise).toHaveBeenCalledTimes(1);
  await view.rerender({ item: { ...exercise, equipment: 'Machine B' } });
  await waitFor(() => expect(view.result.current.data).toBeNull());
  await act(async () => { resolveFirst({ workoutId: 'old', activityDate: '2026-11-01', sessionType: 'Push', locationName: 'Home', exercise: { ...exercise, id: 'old-exercise', sets: [{ id: 'old-set', weight: 90, reps: 8 }] } }); });
  expect(view.result.current.data).toBeNull();
  expect(getPreviousExercise).toHaveBeenCalledTimes(2);
});

it('distinguishes failed recent-session queries from empty history and supports retry', async () => {
  const getRecentSessions = jest.fn().mockRejectedValueOnce(new Error('Unavailable')).mockResolvedValue([]);
  const store: Pick<WorkoutStore, 'getRecentSessions'> = { getRecentSessions };
  jest.mocked(openStore).mockResolvedValue(store as WorkoutStore);
  const { result } = await renderHook(() => useRecentSessions(context, 'Push'));
  await waitFor(() => expect(result.current.error).toMatch(/Unable/));
  expect(result.current.data).toBeUndefined();
  await act(async () => { result.current.retry(); });
  await waitFor(() => expect(result.current.data).toEqual([]));
  expect(result.current.error).toBe('');
});
