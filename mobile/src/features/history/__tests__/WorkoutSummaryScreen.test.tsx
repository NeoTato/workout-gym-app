import { fireEvent, render, screen } from '@testing-library/react-native';
import { summarizePeriod } from '../../../domain/workoutSummary';
import type { WorkoutListItem } from '../../../domain/workout';
import { getTheme } from '../../../ui/theme';
import { WorkoutSummaryScreen } from '../WorkoutSummaryScreen';

const workout: WorkoutListItem = { id: 'push', activityDate: '2026-11-05', startedAt: '2026-11-05T01:00:00Z', endedAt: '2026-11-05T02:00:00Z', timezone: 'Asia/Manila', sessionType: 'Push', locationId: 'gym', locationKind: 'gym', locationName: 'Gym A' };
const props = { kind: 'month' as const, anchor: '2026-11-05', today: '2026-11-05', retry: jest.fn(), back: jest.fn(), changeKind: jest.fn(), changeAnchor: jest.fn(), theme: getTheme('light') };

it('shows current-period totals, type/location counts, and period navigation', async () => {
  const data = summarizePeriod('month', props.anchor, props.today, [workout, { ...workout, id: 'core', sessionType: 'Core', locationKind: 'home' }], [{ sessionId: 'push', group: 'Chest' }]);
  await render(<WorkoutSummaryScreen {...props} data={data} error="" />);
  expect(screen.getByText('So far')).toBeOnTheScreen();
  expect(screen.getByLabelText('2 workouts')).toBeOnTheScreen();
  expect(screen.getByLabelText('1 active day')).toBeOnTheScreen();
  expect(screen.getByLabelText('Push, 1 workout')).toBeOnTheScreen();
  expect(screen.getByLabelText('Core, 1 workout')).toBeOnTheScreen();
  expect(screen.getByLabelText('Chest, 1 workout')).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'Summary period: Year' }));
  expect(props.changeKind).toHaveBeenCalledWith('year');
  await fireEvent.press(screen.getByRole('button', { name: 'Previous period' }));
  expect(props.changeAnchor).toHaveBeenCalledWith('2026-10-01');
});

it('separates failed requests from empty and future results', async () => {
  const view = await render(<WorkoutSummaryScreen {...props} data={null} error="Storage unavailable" />);
  expect(screen.queryByText('No completed workouts in this period.')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Retry summary' })); expect(props.retry).toHaveBeenCalled();
  const future = summarizePeriod('month', '2026-12-01', props.today, [], []);
  await view.rerender(<WorkoutSummaryScreen {...props} anchor="2026-12-01" data={future} error="" />);
  expect(screen.getByText('Future period · no completed results')).toBeOnTheScreen();
  expect(screen.queryByText('No completed workouts in this period.')).toBeNull();
});
