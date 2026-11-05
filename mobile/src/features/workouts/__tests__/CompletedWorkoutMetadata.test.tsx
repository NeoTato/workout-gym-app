import { render, screen } from '@testing-library/react-native';
import { CompletedWorkoutMetadata } from '../CompletedWorkoutMetadata';
import { getTheme } from '../../../ui/theme';

const workout = { startedAt: '2026-11-05T01:00:00Z', endedAt: '2026-11-05T02:15:00Z', timezone: 'Asia/Manila', locationName: 'Gym A' };

it('shows the workout date once, a compact time range, duration, and location in the recorded timezone', async () => {
  await render(<CompletedWorkoutMetadata workout={workout} theme={getTheme('light')} />);
  expect(screen.getAllByText('Thu, Nov 5, 2026')).toHaveLength(1);
  expect(screen.getByText('09:00 – 10:15 · 1 hr 15 min')).toBeOnTheScreen();
  expect(screen.getByText('Gym A')).toBeOnTheScreen();
  expect(screen.getByText('Asia/Manila')).toBeOnTheScreen();
  expect(screen.queryByText(/Saved on this phone/)).toBeNull();
});

it('includes the end date for overnight and cross-year sessions', async () => {
  await render(<CompletedWorkoutMetadata workout={{ ...workout, startedAt: '2026-12-31T15:30:00Z', endedAt: '2026-12-31T17:00:00Z' }} theme={getTheme('dark')} />);
  expect(screen.getByText('Thu, Dec 31, 2026')).toBeOnTheScreen();
  expect(screen.getByText('23:30 – Jan 1, 2027, 01:00 · 1 hr 30 min')).toBeOnTheScreen();
});
