import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { openStore } from '../../../storage/openStore';
import type { WorkoutStore } from '../../../storage/workoutStore';
import { getTheme } from '../../../ui/theme';
import { RoutineDialog } from '../RoutineDialog';

jest.mock('../../../storage/openStore', () => ({ openStore: jest.fn() }));
jest.mock('../useRoutines', () => ({ useRoutines: () => ({ items: [{ id: 'routine', name: 'Push A', sessionType: 'Push', locationId: 'home', locationName: 'Home', exercises: [] }], loading: false, error: '', reload: jest.fn() }) }));

it('creates a routine only on explicit save and keeps the dialog open on failure', async () => {
  const saveWorkoutAsRoutine = jest.fn().mockRejectedValueOnce(new Error('A routine with this name already exists.')).mockResolvedValue({ name: 'Push B' });
  const store: Pick<WorkoutStore, 'saveWorkoutAsRoutine'> = { saveWorkoutAsRoutine };
  jest.mocked(openStore).mockResolvedValue(store as WorkoutStore);
  const saved = jest.fn();
  await render(<RoutineDialog mode="save" theme={getTheme('light')} workoutId="workout" close={jest.fn()} saved={saved} />);
  expect(screen.getByRole('button', { name: 'Create routine' })).toBeDisabled();
  await fireEvent.changeText(screen.getByLabelText('New routine name'), 'Push A');
  await fireEvent.press(screen.getByRole('button', { name: 'Create routine' }));
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/already exists/));
  expect(saved).not.toHaveBeenCalled();
  await fireEvent.changeText(screen.getByLabelText('New routine name'), 'Push B');
  await fireEvent.press(screen.getByRole('button', { name: 'Create routine' }));
  await waitFor(() => expect(saved).toHaveBeenCalledWith('Push B'));
  expect(saveWorkoutAsRoutine).toHaveBeenLastCalledWith('workout', 'Push B', undefined);
});

it('requires confirmation before replacing a routine and cancels without writing', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined), close = jest.fn();
  try {
    await render(<RoutineDialog mode="save" theme={getTheme('dark')} workoutId="workout" close={close} saved={jest.fn()} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Replace routine Push A' }));
    expect(alert).toHaveBeenCalled();
    expect(openStore).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: 'Close routines' }));
    expect(close).toHaveBeenCalledTimes(1);
  } finally { alert.mockRestore(); }
});

it('warns about equipment when choosing a routine at another location', async () => {
  const choose = jest.fn();
  await render(<RoutineDialog mode="choose" theme={getTheme('light')} locationId="gym" close={jest.fn()} choose={choose} />);
  expect(screen.getByText(/Different location/)).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'Use routine Push A' }));
  expect(choose).toHaveBeenCalledWith(expect.objectContaining({ id: 'routine' }));
});
