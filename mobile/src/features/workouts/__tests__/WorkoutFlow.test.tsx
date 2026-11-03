import { fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';
import WorkoutRoute from '../../../app/workout';
import type { WorkoutDraft } from '../../../domain/workout';
import { useWorkoutDraft } from '../useWorkoutDraft';

jest.mock('expo-router', () => ({ router: { replace: jest.fn() } }));
jest.mock('expo-crypto', () => ({ randomUUID: () => 'new-id' }));
jest.mock('../useWorkoutDraft', () => ({ useWorkoutDraft: jest.fn(), newExercise: jest.fn() }));
jest.mock('@react-native-community/datetimepicker', () => ({ __esModule: true, default: () => null }));

let seed: WorkoutDraft;
function useTestDraft() {
  const [draft, setDraft] = useState(seed);
  return { draft, locations: [{ id: 'home', name: 'Home', kind: 'home' as const }], status: 'Saved on this phone', error: '',
    busy: false, update: setDraft, addGym: jest.fn(), finish: jest.fn(), discard: jest.fn() };
}
beforeEach(() => {
  seed = { id: 'session', setupComplete: false, startedAt: '2026-11-01T01:00:00Z', activityDate: '2026-11-01', timezone: 'Asia/Manila',
    locationId: '', sessionType: 'Push', exercises: [{ id: 'exercise', name: 'Press', equipment: '', bodyweight: false,
      unit: 'lb', convention: 'total', sets: [{ id: 'set', weight: '35', reps: '10', completed: true }] }] };
  jest.mocked(useWorkoutDraft).mockImplementation(useTestDraft);
});

it('starts with setup, keeps dates collapsed, and requires a location before logging', async () => {
  await render(<WorkoutRoute />);
  expect(screen.getByRole('header', { name: 'Set up workout' })).toBeOnTheScreen();
  expect(screen.queryByLabelText('Exercise 1 set 1 reps')).toBeNull();
  expect(screen.queryByRole('header', { name: 'Workout date and time' })).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Continue to exercises' }));
  expect(screen.getByRole('alert')).toHaveTextContent(/Choose your gym or Home/);
  await fireEvent.press(screen.getByRole('button', { name: 'Workout location: Home' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Continue to exercises' }));
  expect(screen.getByLabelText('Exercise 1 set 1 reps')).toHaveDisplayValue('10');
  expect(screen.queryByRole('button', { name: 'Change date and time' })).toBeNull();
});

it('retains exercises while moving between logging and details', async () => {
  seed.locationId = 'home'; seed.setupComplete = true;
  await render(<WorkoutRoute />);
  await fireEvent.changeText(screen.getByLabelText('Exercise 1 set 1 reps'), '12');
  await fireEvent.press(screen.getByRole('button', { name: 'Edit details' }));
  expect(screen.queryByLabelText('Exercise 1 set 1 reps')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Session type: Upper' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Continue to exercises' }));
  expect(screen.getByLabelText('Exercise 1 set 1 reps')).toHaveDisplayValue('12');
  expect(screen.getByText(/Upper · Home/)).toBeOnTheScreen();
});

it('opens resumed and legacy configured drafts directly in exercise logging', async () => {
  seed.locationId = 'home'; delete seed.setupComplete;
  await render(<WorkoutRoute />);
  expect(screen.getByRole('button', { name: 'Finish workout' })).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: 'Continue to exercises' })).toBeNull();
});
