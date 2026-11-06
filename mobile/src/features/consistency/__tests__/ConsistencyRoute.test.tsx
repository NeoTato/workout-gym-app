import { render, screen } from '@testing-library/react-native';
import ConsistencyRoute from '../../../app/consistency';
import { calculateConsistency } from '../../../domain/weeklyGoals';
import { summaryPeriodLabel } from '../../../domain/workoutSummary';
import { useWeeklyConsistency } from '../useWeeklyConsistency';

jest.mock('expo-router', () => ({ router: { canGoBack: () => true, back: jest.fn() } }));
jest.mock('../useWeeklyConsistency', () => ({ useWeeklyConsistency: jest.fn() }));
jest.mock('../../../storage/openStore', () => ({ openStore: jest.fn() }));

it('shows the current week once and only adds history when previous weeks exist', async () => {
  const goals = [{ effectiveWeekStart: '2026-10-26', targetDays: 3 }];
  jest.mocked(useWeeklyConsistency).mockReturnValue({ data: calculateConsistency(['2026-11-02'], goals, '2026-11-06'), error: '', retry: jest.fn() });
  const view = await render(<ConsistencyRoute />);
  expect(screen.getAllByText(summaryPeriodLabel('week', '2026-11-02'))).toHaveLength(1);
  expect(screen.queryByRole('header', { name: 'Previous weeks' })).toBeNull();
  jest.mocked(useWeeklyConsistency).mockReturnValue({ data: calculateConsistency(['2026-10-29', '2026-11-02'], goals, '2026-11-06'), error: '', retry: jest.fn() });
  await view.rerender(<ConsistencyRoute />);
  expect(screen.getByRole('header', { name: 'Previous weeks' })).toBeOnTheScreen();
  expect(screen.getAllByText(summaryPeriodLabel('week', '2026-11-02'))).toHaveLength(1);
  expect(screen.getByText(summaryPeriodLabel('week', '2026-10-26'))).toBeOnTheScreen();
});
