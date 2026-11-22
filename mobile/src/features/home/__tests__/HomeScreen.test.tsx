import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { HomeScreen } from '../HomeScreen';
import { getTheme } from '../../../ui/theme';
import type { SavedWorkout, WorkoutListItem } from '../../../domain/workout';

const latest: WorkoutListItem = { id: 'latest', activityDate: '2026-11-21', startedAt: '2026-11-21T09:00:00Z', endedAt: '2026-11-21T10:00:00Z', sessionType: 'Pull', locationId: 'gym', locationKind: 'gym', locationName: 'My gym', timezone: 'Asia/Manila' };
const details: SavedWorkout = { ...latest, exercises: [{ id: 'curl', name: 'Curl', equipment: 'Dumbbell', bodyweight: false, unit: 'kg', convention: 'per_hand', sets: [{ id: 'set', weight: 10, reps: 8 }] }] };

describe('Home screen foundation', () => {
  it.each(['light', 'dark'] as const)('shows the latest workout after weekly progress and opens it in %s', async scheme => {
    const open = jest.fn(), history = jest.fn();
    await render(<HomeScreen theme={getTheme(scheme)} workouts={[latest]} latestWorkout={details} onOpen={open} onHistory={history} weeklyProgress={<Text testID="week">Weekly progress</Text>} />);
    expect(screen.getByText('1 exercise')).toBeOnTheScreen(); expect(screen.getByText('1 set')).toBeOnTheScreen();
    const output = JSON.stringify(screen.toJSON()); expect(output.indexOf('Weekly progress')).toBeLessThan(output.indexOf('latest-workout-card'));
    await fireEvent.press(screen.getByTestId('latest-workout-card')); expect(open).toHaveBeenCalledWith('latest');
    await fireEvent.press(screen.getByRole('button', { name: 'View history' })); expect(history).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('workout-calendar')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Workout summaries' })).toBeNull();
  });
  it('starts a new workout or resumes a saved draft', async () => {
    const start = jest.fn();
    const view = await render(<HomeScreen theme={getTheme('light')} onStart={start} />);
    expect(screen.queryByRole('button', { name: 'Resume workout' })).toBeNull();
    await view.rerender(<HomeScreen theme={getTheme('light')} onStart={start} hasDraft />);
    expect(screen.getByRole('button', { name: 'Resume workout' })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Resume workout' })); expect(start).toHaveBeenCalledTimes(1);
  });
  it('starts with an honest empty history instead of prototype workout data', async () => {
    await render(<HomeScreen theme={getTheme('light')} />);

    expect(screen.getByRole('header', { name: 'Your training' })).toBeOnTheScreen();
    expect(screen.getByText('No workouts yet')).toBeOnTheScreen();
    expect(screen.getByText(/Your latest completed workout will appear here/)).toBeOnTheScreen();
    expect(screen.queryByText('Gym A')).toBeNull();
    expect(screen.queryByText('4 weeks')).toBeNull();
  });

  it.each(['light', 'dark'] as const)('uses the %s appearance for the overview', async (scheme) => {
    const theme = getTheme(scheme);
    await render(<HomeScreen theme={theme} />);

    expect(screen.getByTestId('home-screen')).toHaveStyle({ backgroundColor: theme.background });
    expect(screen.getByText('Your training')).toHaveStyle({ color: theme.text });
  });

  it('keeps the screen readable when the system has no appearance preference', async () => {
    await render(<HomeScreen theme={getTheme(null)} />);

    expect(screen.getByTestId('home-screen')).toHaveStyle({
      backgroundColor: getTheme('light').background,
    });
    expect(screen.getByText('No workouts yet')).toBeOnTheScreen();
  });
});
