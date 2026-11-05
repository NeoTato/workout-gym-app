import { fireEvent, render, screen } from '@testing-library/react-native';
import type { WorkoutListItem } from '../../../domain/workout';
import { getTheme } from '../../../ui/theme';
import { WorkoutCalendar } from '../WorkoutCalendar';

const workout: WorkoutListItem = { id: 'push', activityDate: '2026-11-05', startedAt: '2026-11-05T01:00:00Z', endedAt: '2026-11-05T02:00:00Z', timezone: 'Asia/Manila', sessionType: 'Push', locationId: 'gym', locationKind: 'gym', locationName: 'Gym A' };
const items = [workout, { ...workout, id: 'core', sessionType: 'Core', locationId: 'home', locationKind: 'home' as const, locationName: 'Home' }];

it('counts sessions separately from days, opens the selected day, and filters Gym/Home', async () => {
  const openDay = jest.fn();
  await render(<WorkoutCalendar workouts={items} theme={getTheme('light')} today="2026-11-05" openDay={openDay} />);
  expect(screen.getByText('2 workouts · 1 active day')).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'Thursday, November 5, 2026, today, 2 completed workouts' }));
  expect(openDay).toHaveBeenCalledWith('2026-11-05', 'all');
  await fireEvent.press(screen.getByRole('button', { name: 'Show workouts: Home' }));
  expect(screen.getByText('1 workout · 1 active day')).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: 'Open Push workout on 2026-11-05' })).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Thursday, November 5, 2026, today, 1 completed workout' }));
  expect(openDay).toHaveBeenLastCalledWith('2026-11-05', 'home');
});

it('keeps the selected month/filter after refreshed history and navigates empty months', async () => {
  const view = await render(<WorkoutCalendar workouts={items} theme={getTheme('dark')} today="2026-11-05" openDay={jest.fn()} />);
  await fireEvent.press(screen.getByRole('button', { name: 'Show workouts: Gym' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Previous month' }));
  expect(screen.getByRole('header', { name: 'October 2026' })).toBeOnTheScreen();
  expect(screen.getByText('No completed workouts in this month for gyms.')).toBeOnTheScreen();
  await view.rerender(<WorkoutCalendar workouts={[...items, { ...workout, id: 'backdated', activityDate: '2026-10-31' }]} theme={getTheme('dark')} today="2026-11-05" openDay={jest.fn()} />);
  expect(screen.getByRole('header', { name: 'October 2026' })).toBeOnTheScreen();
  expect(screen.getByText('1 workout · 1 active day')).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'Back to this month' }));
  expect(screen.getByRole('header', { name: 'November 2026' })).toBeOnTheScreen();
});
