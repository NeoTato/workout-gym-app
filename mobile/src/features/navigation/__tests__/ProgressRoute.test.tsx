import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import ProgressRoute from '../../../app/progress';
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
test('keeps the exercise browser and weekly/monthly/yearly reports reachable from Progress', async () => {
  await render(<ProgressRoute />);
  expect(screen.getByText('Loads, reps and equipment history')).toBeOnTheScreen(); expect(screen.getByText('Weekly, monthly and yearly totals')).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'Exercise progress' })); expect(router.push).toHaveBeenCalledWith('/progress/exercises');
  await fireEvent.press(screen.getByRole('button', { name: 'Workout summaries' })); expect(router.push).toHaveBeenCalledWith('/summary');
});
