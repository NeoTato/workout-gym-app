import { act, renderHook, waitFor } from '@testing-library/react-native';
import { calculateConsistency, type WeeklyConsistency } from '../../../domain/weeklyGoals';
import { openStore } from '../../../storage/openStore';
import type { WorkoutStore } from '../../../storage/workoutStore';
import { useWeeklyConsistency } from '../useWeeklyConsistency';

jest.mock('expo-router', () => ({ useFocusEffect: (callback: () => void) => {
  const React = jest.requireActual('react'); React.useEffect(callback, [callback]);
} }));
jest.mock('../../../storage/openStore', () => ({ openStore: jest.fn() }));

it('ignores an old date response and recovers from errors through retry', async () => {
  const goals = [{ effectiveWeekStart: '2026-11-02', targetDays: 3 }];
  let resolveFirst!: (value: WeeklyConsistency) => void;
  const data = calculateConsistency([], goals, '2026-11-09');
  const getWeeklyConsistency = jest.fn().mockImplementationOnce(() => new Promise<WeeklyConsistency>(resolve => { resolveFirst = resolve; })).mockRejectedValueOnce(new Error('disk')).mockResolvedValue(data);
  jest.mocked(openStore).mockResolvedValue({ getWeeklyConsistency } as unknown as WorkoutStore);
  const view = await renderHook<ReturnType<typeof useWeeklyConsistency>, { today: string }>(({ today }) => useWeeklyConsistency(today), { initialProps: { today: '2026-11-05' } });
  await waitFor(() => expect(getWeeklyConsistency).toHaveBeenCalledTimes(1));
  await view.rerender({ today: '2026-11-09' });
  await waitFor(() => expect(view.result.current.error).toContain('Unable to load'));
  await act(async () => resolveFirst(calculateConsistency([], goals, '2026-11-05')));
  expect(view.result.current.data).toBeNull();
  await act(async () => view.result.current.retry());
  await waitFor(() => expect(view.result.current.data?.currentWeek.start).toBe('2026-11-09'));
});
