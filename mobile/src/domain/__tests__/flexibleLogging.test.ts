import { canCompleteSet, completedExercises, type WorkoutDraft } from '../workout';

const draft: WorkoutDraft = { id: 'workout', startedAt: '2026-11-01T01:00:00Z', activityDate: '2026-11-01', timezone: 'Asia/Manila', locationId: 'home', sessionType: 'Core', exercises: [] };
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
