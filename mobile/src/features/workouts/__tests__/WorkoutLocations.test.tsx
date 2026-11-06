import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { WorkoutSessionDetails } from '../WorkoutSessionDetails';
import { getTheme } from '../../../ui/theme';
import type { WorkoutDraft } from '../../../domain/workout';

jest.mock('@react-native-community/datetimepicker', () => ({ __esModule: true, default: () => null }));
const draft: WorkoutDraft = { id: 'draft', locationId: 'home', activityDate: '2026-11-04', startedAt: '2026-11-04T01:00:00Z', timezone: 'Asia/Manila', sessionType: 'Push', exercises: [] };
const locations = [{ id: 'home', name: 'Home', kind: 'home' as const }, { id: 'gym', name: 'Gym A', kind: 'gym' as const }, { id: 'old', name: 'Old gym', kind: 'gym' as const, archived: 1 }];

it('hides removed choices and requires confirmation before removing a gym', async () => {
  const removeLocation = jest.fn().mockResolvedValue(undefined);
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  try {
    await render(<WorkoutSessionDetails draft={draft} locations={locations} theme={getTheme('light')} busy={false} update={jest.fn()} removeLocation={removeLocation} />);
    expect(screen.queryByRole('button', { name: 'Workout location: Old gym' })).toBeNull();
    expect(screen.queryByTestId('location-manager')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Manage locations' }));
    expect(screen.getByTestId('location-manager')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Remove Home' })).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Remove Gym A' }));
    expect(removeLocation).not.toHaveBeenCalled();
    const actions = alert.mock.calls[0][2]!;
    await actions.find(action => action.text === 'Remove')!.onPress!();
    expect(removeLocation).toHaveBeenCalledWith('gym');
    await fireEvent.press(screen.getByRole('button', { name: 'Close locations' }));
    expect(screen.queryByTestId('location-manager')).toBeNull();
  } finally { alert.mockRestore(); }
});

it('keeps a removed location visible when editing its existing workout', async () => {
  await render(<WorkoutSessionDetails draft={{ ...draft, locationId: 'old' }} locations={locations} theme={getTheme('light')} busy={false} update={jest.fn()} />);
  expect(screen.getByRole('button', { name: 'Workout location: Old gym (removed)' })).toBeOnTheScreen();
});

it('reveals gym entry on demand, retains it after failure and closes it after saving', async () => {
  const addGym = jest.fn().mockRejectedValueOnce(new Error('disk')).mockResolvedValue(undefined);
  await render(<WorkoutSessionDetails draft={draft} locations={locations} theme={getTheme('light')} busy={false} update={jest.fn()} addGym={addGym} />);
  expect(screen.queryByLabelText('New gym name')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: '+ New gym' }));
  await fireEvent.changeText(screen.getByLabelText('New gym name'), 'Gym B');
  await fireEvent.press(screen.getByRole('button', { name: '+ Add gym' }));
  await waitFor(() => expect(screen.getByRole('alert')).toBeOnTheScreen());
  expect(screen.getByLabelText('New gym name')).toHaveDisplayValue('Gym B');
  await fireEvent.press(screen.getByRole('button', { name: '+ Add gym' }));
  await waitFor(() => expect(screen.queryByLabelText('New gym name')).toBeNull());
  expect(addGym).toHaveBeenLastCalledWith('Gym B');
});
