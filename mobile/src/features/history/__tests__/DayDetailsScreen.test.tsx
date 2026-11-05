import { fireEvent, render, screen } from '@testing-library/react-native';
import { DayDetailsScreen } from '../DayDetailsScreen';
import { getTheme } from '../../../ui/theme';
import type { SavedWorkout } from '../../../domain/workout';

const workout: SavedWorkout = { id: 'push', activityDate: '2026-11-05', startedAt: '2026-11-05T01:00:00Z', endedAt: '2026-11-05T02:00:00Z', timezone: 'Asia/Manila', sessionType: 'Push', locationName: 'Gym A', exercises: [{ id: 'press', name: 'Press', equipment: 'Bench', bodyweight: false, unit: 'kg', convention: 'total', sets: [{ id: 'set', weight: 40, reps: 8 }] }] };

it('shows all sessions for a day with expandable sets and an editor link', async () => {
  const open = jest.fn();
  await render(<DayDetailsScreen date="2026-11-05" filter="all" workouts={[workout, { ...workout, id: 'core', sessionType: 'Core', locationName: 'Home', exercises: [] }]} error="" theme={getTheme('light')} retry={jest.fn()} back={jest.fn()} open={open} />);
  expect(screen.getByText('2 workouts')).toBeOnTheScreen();
  expect(screen.getByRole('header', { name: 'Core' })).toBeOnTheScreen();
  expect(screen.queryByText(/Set 1:/)).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Press, 1 set' }));
  expect(screen.getByText('Set 1: 40 kg × 8 reps')).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'View or edit Push workout' }));
  expect(open).toHaveBeenCalledWith('push');
});

it('separates query failure from an empty day and exposes retry', async () => {
  const retry = jest.fn(), props = { date: '2026-11-05', filter: 'home' as const, theme: getTheme('dark'), retry, back: jest.fn(), open: jest.fn() };
  const view = await render(<DayDetailsScreen {...props} workouts={null} error="Storage unavailable" />);
  expect(screen.queryByText('No completed workouts on this day.')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Retry day' })); expect(retry).toHaveBeenCalledTimes(1);
  await view.rerender(<DayDetailsScreen {...props} workouts={[]} error="" />);
  expect(screen.getByText('No completed workouts on this day.')).toBeOnTheScreen();
});
