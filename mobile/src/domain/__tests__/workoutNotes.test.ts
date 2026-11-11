import { compatibleNoteMatches, noteToExercise, parseWorkoutNotes } from '../workoutNotes';

const example = `pull ups 5reps 5reps 2reps
lateral pulldowns 70lbsx13 100lbsx12 100lbsx8
close grip horizontal pull 85lbsx12 85x6 85x8

preacher curl 12.5kgx4 10kg x8 10kgx8
hammer dumbbell curl 5kg x12 5kg x12 7.5kgx10

inclined situps 10kg x18 10kg x18
halos 10kgx12 10kgx12 10kgx12`;
test('reads the full notes example without dropping sets or decimal loads', () => {
  const result = parseWorkoutNotes(example);
  expect(result.issues).toEqual([]); expect(result.exercises).toHaveLength(7);
  expect(result.exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0)).toBe(20);
  expect(result.exercises[0]).toMatchObject({ bodyweight: true, sets: [{ weight: '', reps: '5' }, { weight: '', reps: '5' }, { weight: '', reps: '2' }] });
  expect(result.exercises[2]).toMatchObject({ unit: 'lb', inferredUnit: true, sets: [{ weight: '85', reps: '12' }, { weight: '85', reps: '6' }, { weight: '85', reps: '8' }] });
  expect(result.exercises[3].sets[0]).toEqual({ weight: '12.5', reps: '4' });
});
test.each(['curl 85x6', 'curl 10kgx8 20lbsx6', 'curl 10kgx8 nonsense', 'curl -5kgx8', 'curl 5kgx0', 'curl 5kgx1.5', 'curl 5kgx8 8reps', 'plank 45 seconds', 'run 2km 15min', 'curl 5kgx8 + drop set'])('keeps unsupported or partial lines as issues: %s', text => {
  const result = parseWorkoutNotes(text); expect(result.exercises).toHaveLength(0); expect(result.issues).toHaveLength(1); expect(result.issues[0].source).toBe(text);
});
test('accepts unit case, spaces, plates, zero load and CRLF, but never inherits across lines', () => {
  const result = parseWorkoutNotes('Press: 0 KG × 12, 2.5kgs x 8\r\nCable 3platesx10\\\r\nRow 85x8');
  expect(result.exercises).toHaveLength(2); expect(result.exercises[0].unit).toBe('kg'); expect(result.exercises[1].unit).toBe('plates'); expect(result.issues[0].line).toBe(3);
});
test('bounds input and set counts', () => {
  expect(() => parseWorkoutNotes(' ')).toThrow(); expect(() => parseWorkoutNotes('x'.repeat(20001))).toThrow();
  expect(() => parseWorkoutNotes(Array(101).fill('pull ups 5reps').join('\n'))).toThrow();
  expect(parseWorkoutNotes('curl ' + Array(51).fill('5kgx8').join(' ')).issues).toHaveLength(1);
});
test('matches only compatible tracking and preserves measurements while copying confirmed identity', () => {
  const note = parseWorkoutNotes('curl 12.5kgx8').exercises[0];
  const match = { id: 'curl', name: 'Preacher curl', bodyweight: false, category: 'Pull' as const, subcategory: 'Biceps' as const };
  expect(compatibleNoteMatches(note, [match, { id: 'timed', name: 'curl', bodyweight: false, tracking: 'duration' }, { id: 'bw', name: 'curl', bodyweight: true }])).toEqual([match]);
  let id = 0; const exercise = noteToExercise(note, () => String(++id), match);
  expect(exercise).toMatchObject({ catalogId: 'curl', category: 'Pull', subcategory: 'Biceps', unit: 'kg', equipment: '', sets: [{ weight: '12.5', reps: '8', completed: true }] });
  expect(exercise.id).not.toBe(exercise.sets[0].id);
  expect(() => noteToExercise(note, () => 'id', { ...match, bodyweight: true })).toThrow();
});
