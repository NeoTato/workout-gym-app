import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { useState } from 'react';
import WorkoutRoute from '../../../app/workout';
import { completedExercises, type WorkoutDraft } from '../../../domain/workout';
import { newExercise, useWorkoutDraft } from '../useWorkoutDraft';

jest.mock('expo-router', () => ({ router: { replace: jest.fn() } }));
jest.mock('../../rest/restContext', () => ({ useRestTimer: () => ({ open: jest.fn(), autoStart: jest.fn(), quickStart: jest.fn() }) }));
jest.mock('../useExerciseLibrary', () => ({ useExerciseLibrary: () => ({ items: [], loading: false, error: '', retry: jest.fn() }) }));
jest.mock('../WorkoutReferences', () => ({ RecentSessions: () => null, PreviousExerciseSets: () => null }));
jest.mock('../useRoutines', () => ({ useRoutines: () => ({ items: [{ id: 'routine', name: 'Push A', sessionType: 'Push', locationId: 'home', locationName: 'Home', exercises: [
  { catalogId: 'press', name: 'Routine press', equipment: 'Dumbbells', bodyweight: false, unit: 'lb', convention: 'total', setCount: 2 },
] }], loading: false, error: '', reload: jest.fn() }) }));
let mockGeneratedId = 0;
jest.mock('expo-crypto', () => ({ randomUUID: () => `generated-${++mockGeneratedId}` }));
jest.mock('../useWorkoutDraft', () => ({ useWorkoutDraft: jest.fn(), newExercise: jest.fn() }));
jest.mock('@react-native-community/datetimepicker', () => ({ __esModule: true, default: () => null }));

let seed: WorkoutDraft;
const finish = jest.fn();
function useTestDraft() {
  const [draft, setDraft] = useState(seed);
  return { draft, locations: [{ id: 'home', name: 'Home', kind: 'home' as const }], status: 'Saved on this phone', error: '',
    busy: false, update: setDraft, addGym: jest.fn(), removeLocation: jest.fn(), finish, discard: jest.fn() };
}
beforeEach(() => {
  finish.mockReset();
  seed = { id: 'session', setupComplete: false, startedAt: '2026-11-01T01:00:00Z', activityDate: '2026-11-01', timezone: 'Asia/Manila',
    locationId: '', sessionType: 'Push', exercises: [{ id: 'exercise', name: 'Press', equipment: '', bodyweight: false,
      unit: 'lb', convention: 'total', sets: [{ id: 'set', weight: '35', reps: '10', completed: true }] }] };
  jest.mocked(useWorkoutDraft).mockImplementation(useTestDraft);
  jest.mocked(newExercise).mockReturnValue({ id: 'added', name: '', equipment: '', bodyweight: false, unit: 'lb', convention: 'total',
    sets: [{ id: 'new-set', weight: '', reps: '', completed: false }] });
});

it('appends pasted exercises without replacing existing work or finishing history', async () => {
  seed.locationId = 'home'; seed.setupComplete = true;
  await render(<WorkoutRoute />);
  await fireEvent.press(screen.getByRole('button', { name: 'Paste workout notes' }));
  await fireEvent.changeText(screen.getByLabelText('Workout notes'), 'pull ups 5reps 2reps');
  await fireEvent.press(screen.getByRole('button', { name: 'Review detected workout' }));
  await fireEvent.press(screen.getByRole('checkbox', { name: 'I reviewed the detected sets and assumptions' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Add 1 exercise to draft' }));
  expect(screen.getByText('Press')).toBeOnTheScreen(); expect(screen.getByText('pull ups')).toBeOnTheScreen();
  expect(screen.getByLabelText('Exercise 1 set 1 reps')).toHaveDisplayValue('10');
  expect(screen.getByLabelText('Exercise 2 set 1 reps')).toHaveDisplayValue('5');
  expect(finish).not.toHaveBeenCalled();
});

it('keeps imported curls complete after editing load convention, unit, equipment and category', async () => {
  seed.locationId = 'home'; seed.setupComplete = true; seed.exercises = [];
  const saved = jest.fn();
  function useSavingDraft() {
    const model = useTestDraft();
    return { ...model, finish: async () => { saved(completedExercises(model.draft)); return undefined; } };
  }
  jest.mocked(useWorkoutDraft).mockImplementation(useSavingDraft);
  await render(<WorkoutRoute />);
  await fireEvent.press(screen.getByRole('button', { name: 'Paste workout notes' }));
  await fireEvent.changeText(screen.getByLabelText('Workout notes'), 'preacher curl 12.5kgx4 10kgx8 10kgx8\nhammer dumbbell curl 5kgx12 5kgx12 7.5kgx10');
  await fireEvent.press(screen.getByRole('button', { name: 'Review detected workout' }));
  await fireEvent.press(screen.getByRole('checkbox', { name: 'I reviewed the detected sets and assumptions' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Add 2 exercises to draft' }));
  for (const index of [1, 2]) {
    await fireEvent.press(screen.getByRole('button', { name: `Exercise ${index} settings` }));
    await fireEvent.press(screen.getByRole('button', { name: 'Load means: Per hand' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Load unit: lbs' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Load unit: kg' }));
    await fireEvent.changeText(screen.getByLabelText(`Exercise ${index} equipment label`), 'Dumbbells');
    await fireEvent.press(screen.getByRole('button', { name: 'Category: Uncategorized' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Exercise category: Pull' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Subcategory: Not assigned' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Exercise subcategory: Biceps' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Done setup' }));
    expect(screen.getByRole('checkbox', { name: `Exercise ${index} set 1 done`, checked: true })).toBeOnTheScreen();
  }
  expect(screen.getByText('6 sets done')).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'Finish workout' }));
  expect(saved).toHaveBeenCalledWith([
    expect.objectContaining({ name: 'preacher curl', category: 'Pull', subcategory: 'Biceps', convention: 'per_hand', unit: 'kg', sets: expect.arrayContaining([expect.objectContaining({ weight: 12.5, reps: 4 })]) }),
    expect.objectContaining({ name: 'hammer dumbbell curl', category: 'Pull', subcategory: 'Biceps', convention: 'per_hand', unit: 'kg', sets: expect.arrayContaining([expect.objectContaining({ weight: 7.5, reps: 10 })]) }),
  ]);
});

it('records attendance only after explicit confirmation and keeps populated workouts out of quick entry', async () => {
  seed.locationId = 'home'; seed.exercises = [];
  await render(<WorkoutRoute />);
  await fireEvent.press(screen.getByRole('button', { name: 'Record workout only' }));
  expect(finish).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
  expect(finish).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: 'Record workout only' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Record workout' }));
  expect(finish).toHaveBeenCalledWith(true);
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
  expect(screen.queryByText(/Only completed sets are saved/)).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'How logging works' }));
  expect(screen.getByText(/Only completed sets are saved/)).toBeOnTheScreen();
  expect(screen.getByLabelText('Exercise 1 set 1 reps')).toHaveDisplayValue('10');
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
  expect(screen.getByText('Upper')).toBeOnTheScreen();
  expect(screen.getByText('Home')).toBeOnTheScreen();
});

it('opens resumed and legacy configured drafts directly in exercise logging', async () => {
  seed.locationId = 'home'; delete seed.setupComplete;
  await render(<WorkoutRoute />);
  expect(screen.getByRole('button', { name: 'Finish workout' })).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: 'Continue to exercises' })).toBeNull();
});

it('adds an editable routine copy in setup with blank, incomplete sets', async () => {
  seed.exercises = [];
  await render(<WorkoutRoute />);
  expect(screen.getByRole('button', { name: 'Choose routine' })).toBeDisabled();
  await fireEvent.press(screen.getByRole('button', { name: 'Workout location: Home' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Choose routine' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Use routine Push A' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Continue to exercises' }));
  expect(screen.getByRole('header', { name: 'Routine press' })).toBeOnTheScreen();
  expect(screen.getByLabelText('Exercise 1 set 1 load (lb)')).toHaveDisplayValue('');
  expect(screen.getByLabelText('Exercise 1 set 2 reps')).toHaveDisplayValue('');
  expect(screen.getByRole('checkbox', { name: 'Exercise 1 set 1 done', checked: false })).toBeDisabled();
});

it.each([
  ['All', '', ''], ['Uncategorized', '', ''],
  ['Push', '', 'Push'], ['Push', 'Chest', 'Push'], ['Push', 'Triceps', 'Push'], ['Push', 'Shoulders', 'Push'],
  ['Pull', '', 'Pull'], ['Pull', 'Back', 'Pull'], ['Pull', 'Biceps', 'Pull'],
  ['Legs', '', 'Legs'], ['Core', '', 'Core'], ['Cardio', '', 'Cardio'], ['Mobility', '', 'Mobility'], ['Other', '', 'Other'],
])('adds a %s / %s exercise and preserves its classification in Setup', async (filter, subcategory, category) => {
  seed.locationId = 'home'; seed.setupComplete = true; seed.exercises = [];
  await render(<WorkoutRoute />);
  await fireEvent.press(screen.getByRole('button', { name: '+ Add exercise' }));
  const picker = within(screen.getByTestId('exercise-picker'));
  await fireEvent.press(picker.getByRole('button', { name: `Filter exercises: ${filter}` }));
  if (subcategory) await fireEvent.press(picker.getByRole('button', { name: `Filter subcategory: ${subcategory}` }));
  await fireEvent.changeText(picker.getByLabelText('Search exercise names'), 'New press');
  await fireEvent.press(picker.getByRole('button', { name: '+ Add exercise' }));
  expect(screen.getByLabelText(category === 'Cardio' ? 'Exercise 1 set 1 distance (km)' : 'Exercise 1 set 1 reps')).toHaveDisplayValue('');
  expect(screen.getByRole('checkbox', { name: 'Exercise 1 set 1 done', checked: false })).toBeDisabled();
  await fireEvent.press(screen.getByRole('button', { name: 'Exercise 1 settings' }));
  expect(screen.getByRole('button', { name: `Category: ${category || 'Uncategorized'}` })).toBeOnTheScreen();
  if (category === 'Push' || category === 'Pull') {
    expect(screen.getByRole('button', { name: `Subcategory: ${subcategory || 'Not assigned'}` })).toBeOnTheScreen();
  } else {
    expect(screen.queryByRole('button', { name: /^Subcategory:/ })).toBeNull();
  }
  await fireEvent.press(screen.getByRole('button', { name: 'Done setup' }));
  await fireEvent.changeText(screen.getByLabelText(category === 'Cardio' ? 'Exercise 1 set 1 distance (km)' : 'Exercise 1 set 1 load (lb)'), category === 'Cardio' ? '1.25' : '35');
  await fireEvent.changeText(screen.getByLabelText(category === 'Cardio' ? 'Exercise 1 set 1 duration (seconds)' : 'Exercise 1 set 1 reps'), category === 'Cardio' ? '600' : '10');
  expect(screen.getByRole('checkbox', { name: 'Exercise 1 set 1 done', checked: true })).toBeOnTheScreen();
});
