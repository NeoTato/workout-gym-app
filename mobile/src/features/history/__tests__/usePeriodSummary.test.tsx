import { act, renderHook, waitFor } from '@testing-library/react-native';
import { summarizePeriod, type PeriodSummary, type SummaryPeriod } from '../../../domain/workoutSummary';
import { openStore } from '../../../storage/openStore';
import type { WorkoutStore } from '../../../storage/workoutStore';
import { usePeriodSummary } from '../usePeriodSummary';

jest.mock('expo-router', () => ({ useFocusEffect: (callback: () => void) => {
  const React = jest.requireActual('react'); React.useEffect(callback, [callback]);
} }));
jest.mock('../../../storage/openStore', () => ({ openStore: jest.fn() }));

it('ignores a late month response after switching to an annual report', async () => {
  let resolveFirst: (value: PeriodSummary) => void = () => { throw new Error('Query not started'); };
  const annual = summarizePeriod('year', '2026-11-05', '2026-11-05', [], []);
  const getPeriodSummary = jest.fn().mockImplementationOnce(() => new Promise<PeriodSummary>(resolve => { resolveFirst = resolve; })).mockResolvedValue(annual);
  const store: Pick<WorkoutStore, 'getPeriodSummary'> = { getPeriodSummary };
  jest.mocked(openStore).mockResolvedValue(store as WorkoutStore);
  const view = await renderHook<ReturnType<typeof usePeriodSummary>, { kind: SummaryPeriod }>(({ kind }) => usePeriodSummary(kind, '2026-11-05', '2026-11-05'), { initialProps: { kind: 'month' } });
  await waitFor(() => expect(getPeriodSummary).toHaveBeenCalledTimes(1));
  await view.rerender({ kind: 'year' });
  await waitFor(() => expect(view.result.current.data?.kind).toBe('year'));
  await act(async () => { resolveFirst(summarizePeriod('month', '2026-11-05', '2026-11-05', [], [])); });
  expect(view.result.current.data?.kind).toBe('year');
});
