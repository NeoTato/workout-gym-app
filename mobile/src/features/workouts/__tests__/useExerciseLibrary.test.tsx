import { act, renderHook, waitFor } from '@testing-library/react-native';
import { openStore } from '../../../storage/openStore';
import type { WorkoutStore } from '../../../storage/workoutStore';
import { useExerciseLibrary } from '../useExerciseLibrary';

jest.mock('../../../storage/openStore', () => ({ openStore: jest.fn() }));

it('reports suggestion failures and loads the persistent library on retry', async () => {
  const items = [{ id: 'press', name: 'Press', bodyweight: false }];
  const listLoggedExercises = jest.fn().mockRejectedValueOnce(new Error('Unavailable')).mockResolvedValueOnce(items);
  const store: Pick<WorkoutStore, 'listLoggedExercises'> = { listLoggedExercises };
  jest.mocked(openStore).mockResolvedValue(store as WorkoutStore);
  const { result } = await renderHook(useExerciseLibrary);
  await waitFor(() => expect(result.current.error).toMatch(/Suggestions are unavailable/));
  expect(result.current.items).toEqual([]);
  await act(() => result.current.retry());
  await waitFor(() => expect(result.current.items).toEqual(items));
  expect(result.current.error).toBe(''); expect(result.current.loading).toBe(false);
});
