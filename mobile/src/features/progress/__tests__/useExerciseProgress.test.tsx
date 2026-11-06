import { act, renderHook, waitFor } from '@testing-library/react-native';
import { openStore } from '../../../storage/openStore';
import type { WorkoutStore } from '../../../storage/workoutStore';
import { useExerciseProgress } from '../useExerciseProgress';

jest.mock('expo-router', () => ({ useFocusEffect: (callback: () => void) => {
  const React = jest.requireActual('react'); React.useEffect(callback, [callback]);
} }));
jest.mock('../../../storage/openStore', () => ({ openStore: jest.fn() }));

it('ignores a late exercise response and recovers from failure without treating it as empty history', async () => {
  type Data = Awaited<ReturnType<WorkoutStore['getExerciseProgress']>>;
  let first!: (value: Data) => void;
  const getExerciseProgress = jest.fn().mockImplementationOnce(() => new Promise<Data>(resolve => { first = resolve; })).mockRejectedValueOnce(new Error('disk')).mockResolvedValue({ exercise: { id: 'new', name: 'New exercise' }, variations: [] });
  jest.mocked(openStore).mockResolvedValue({ getExerciseProgress } as unknown as WorkoutStore);
  const view = await renderHook<ReturnType<typeof useExerciseProgress>, { id: string }>(({ id }) => useExerciseProgress(id, '2026-11-06'), { initialProps: { id: 'old' } });
  await waitFor(() => expect(getExerciseProgress).toHaveBeenCalledTimes(1));
  await view.rerender({ id: 'new' });
  await waitFor(() => expect(view.result.current.error).toContain('Unable to load'));
  await act(async () => first({ exercise: { id: 'old', name: 'Old exercise' }, variations: [] }));
  expect(view.result.current.data).toBeNull();
  await act(async () => view.result.current.retry());
  await waitFor(() => expect(view.result.current.data?.exercise.id).toBe('new'));
});
