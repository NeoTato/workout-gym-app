import { parseBackup, utf8Size, validateBackup } from '../backup';

const empty = () => ({ format: 'workout-journal-backup', formatVersion: 1, exportedAt: '2026-11-06T01:00:00.000Z', appVersion: '0.1.0', data: {
  locations: [{ id: 'home', name: 'Home', kind: 'home', archived: false }], exercises: [], equipmentVariations: [], routines: [], routineSlots: [], sessions: [], sessionExercises: [], sets: [], weeklyGoals: [{ effectiveWeekStart: '2026-11-02', targetDays: 3 }], draft: null,
} });

test('empty backup round trips and accepts a UTF-8 BOM', () => {
  const backup = empty(); expect(parseBackup('\uFEFF' + JSON.stringify(backup))).toEqual(backup);
  expect(utf8Size('aé🏋')).toBe(new TextEncoder().encode('aé🏋').length);
});

test.each([
  (value: ReturnType<typeof empty>) => { value.formatVersion = 99; },
  (value: ReturnType<typeof empty>) => { value.data.locations = []; },
  (value: ReturnType<typeof empty>) => { value.data.locations[0].archived = true; },
  (value: ReturnType<typeof empty>) => { value.data.locations.push({ ...value.data.locations[0] }); },
  (value: ReturnType<typeof empty>) => { value.data.weeklyGoals[0].targetDays = 8; },
  (value: ReturnType<typeof empty>) => { value.data.weeklyGoals[0].effectiveWeekStart = '2026-11-03'; },
  (value: ReturnType<typeof empty>) => { Object.assign(value.data, { sql: 'DROP TABLE sessions' }); },
])('invalid envelope or invariants reject without accepting partial data (%#)', change => {
  const backup = empty(); change(backup); expect(() => validateBackup(backup)).toThrow(/No data has been changed/);
});

test('unfinished draft preserves blank and invalid pending input, but rejects invalid completed sets', () => {
  const backup = { ...empty(), data: { ...empty().data, draft: {
    id: 'draft', startedAt: '2026-11-06T00:00:00.000Z', activityDate: '2026-11-06', timezone: 'Asia/Manila', locationId: '', sessionType: 'Push', exercises: [{ id: 'exercise', name: '', equipment: '', bodyweight: false, unit: 'kg', convention: 'total', category: 'Push', subcategory: 'Triceps', sets: [{ id: 'set', weight: 'oops', reps: '', completed: false }] }],
  } } };
  expect(validateBackup(backup)).toEqual(backup);
  backup.data.draft.exercises[0].sets[0].completed = true;
  expect(() => validateBackup(backup)).toThrow(/completed measurements/);
  backup.data.draft.exercises[0].sets[0].completed = false;
  backup.data.draft.exercises[0].subcategory = 'Back';
  expect(() => validateBackup(backup)).toThrow(/subcategory/);
});

test('malformed JSON and unsupported fields fail clearly', () => {
  expect(() => parseBackup('{')).toThrow(/not valid JSON/);
  expect(() => validateBackup({ ...empty(), internalRevision: 1 })).toThrow(/fields/);
});
