import { cardioDefault, canCompleteSet, completedExercises, type WorkoutDraft } from '../workout';

const draft: WorkoutDraft = { id: 'workout', startedAt: '2026-11-01T01:00:00Z', activityDate: '2026-11-01', timezone: 'Asia/Manila', locationId: 'home', sessionType: 'Core', exercises: [] };
test('new empty Cardio exercises default to distance and duration without overwriting saved modes or input', () => {
  const exercise = { id: 'run', name: 'Run', category: 'Cardio' as const, equipment: '', bodyweight: false, unit: 'lb' as const, convention: 'total' as const, sets: [{ id: 's', weight: '', reps: '', completed: false }] };
  expect(cardioDefault(exercise).tracking).toBe('distance_duration');
  expect(cardioDefault({ ...exercise, category: 'Core' }).tracking).toBeUndefined();
  expect(cardioDefault({ ...exercise, catalogId: 'saved' }).tracking).toBeUndefined();
  expect(cardioDefault({ ...exercise, tracking: 'duration' }).tracking).toBe('duration');
  expect(cardioDefault({ ...exercise, sets: [{ ...exercise.sets[0], reps: '10' }] }).tracking).toBeUndefined();
});
test('timed and cardio sets validate their own measurements without fake load or reps', () => {
  expect(canCompleteSet({ weight: '', reps: '', duration: '45' }, false, 'duration')).toBe(true);
  for (const duration of ['', '0', '-1', '1.5', '1e3', 'abc']) expect(canCompleteSet({ weight: '', reps: '', duration }, false, 'duration')).toBe(false);
  expect(canCompleteSet({ weight: '', reps: '', duration: '600', distance: '1.25' }, false, 'distance_duration')).toBe(true);
  expect(canCompleteSet({ weight: '', reps: '', duration: '600', distance: '0' }, false, 'distance_duration')).toBe(false);
  const exercises = completedExercises({ ...draft, exercises: [{ id: 'plank', name: 'Plank', equipment: '', bodyweight: false, tracking: 'duration', unit: 'lb', convention: 'total', sets: [{ id: 'hold', weight: '', reps: '', duration: '45', completed: true }] }] });
  expect(exercises[0].sets[0]).toMatchObject({ weight: null, reps: null, durationSeconds: 45, distanceMeters: null });
});
test('workout-only completion is explicit and cannot discard exercise content', () => {
  expect(() => completedExercises(draft)).toThrow(/at least one set/i);
  expect(completedExercises({ ...draft, recordOnly: true })).toEqual([]);
  expect(() => completedExercises({ ...draft, recordOnly: true, exercises: [{ id: 'e', name: 'Press', equipment: '', bodyweight: false, unit: 'lb', convention: 'total', sets: [] }] })).toThrow(/remove/i);
});
