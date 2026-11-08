import { buildCsvExport, CSV_HEADER, csvText, validateCsvSelection, type CsvRow } from '../csvExport';

const row = (change: Partial<CsvRow> = {}): CsvRow => ({
  sessionId: 'workout', activityDate: '2026-11-01', timezone: 'Asia/Manila', startedAt: '2026-11-01T01:00:00.000Z', endedAt: '2026-11-01T02:00:00.000Z', sessionType: 'Push', locationId: 'home', locationName: 'Home', locationKind: 'home', exerciseId: 'exercise', exerciseName: 'Press', equipmentId: 'machine', equipmentName: 'Dumbbells', bodyweight: 0, loadConvention: 'per_hand', loadUnit: 'kg', setId: 'set', setPosition: 0, loadValue: 0, reps: 10, ...change,
});

test('fixed header, BOM, CRLF, original zero/decimals and bodyweight nulls', () => {
  const result = buildCsvExport([row(), row({ setId: 'set-2', setPosition: 1, loadValue: 17.5 }), row({ sessionId: 'bodyweight', exerciseId: 'pull-up', bodyweight: 1, loadValue: null, loadUnit: 'lb', setId: 'bw-set', reps: 8 })]);
  expect(result.text.startsWith('\uFEFF' + CSV_HEADER.join(',') + '\r\n')).toBe(true);
  expect(result.text).toContain(',1,0,"kg",10,'); expect(result.text).toContain(',2,17.5,"kg",10,');
  expect(result.text).toContain('"reps","",1,,"",8,');
  expect(result.summary).toEqual({ workouts: 2, sets: 3, activeDays: 1, firstDate: '2026-11-01', lastDate: '2026-11-01' });
  expect(result.text).toContain(',3600,');
});

test('quoted multiline/Unicode text stays in one cell and formula-like text is prefixed', () => {
  expect(csvText('Café, "Press"\n左')).toBe('"Café, ""Press""\n左"');
  for (const value of ['=1+1', '+SUM(A1)', '-2', '@call', '\ttext', '\rline', '\nline', '  =1', ' \ttext', '＝1', '＋2', '－2', '＠call']) expect(csvText(value)).toBe('"\'' + value.replace(/"/g, '""') + '"');
  expect(csvText('A=1')).toBe('"A=1"'); expect(csvText('')).toBe('""');
});

test('empty selection is header only; a set-less completed session is retained without fake measurements', () => {
  expect(buildCsvExport([]).text).toBe('\uFEFF' + CSV_HEADER.join(',') + '\r\n');
  const result = buildCsvExport([row({ exerciseId: null, exerciseName: null, equipmentId: null, equipmentName: null, setId: null, setPosition: null, reps: null, loadValue: null, bodyweight: null, loadUnit: null, loadConvention: null })]);
  expect(result.text).toContain('"session","workout"'); expect(result.summary.workouts).toBe(1); expect(result.summary.sets).toBe(0);
});

test('inclusive range requires real calendar dates in chronological order', () => {
  expect(validateCsvSelection({ kind: 'all' })).toEqual({ kind: 'all' });
  expect(validateCsvSelection({ kind: 'range', from: '2024-02-29', to: '2024-02-29' })).toEqual({ kind: 'range', from: '2024-02-29', to: '2024-02-29' });
  for (const [from, to] of [['2026-02-29', '2026-03-01'], ['', '2026-11-01'], ['2026-11-02', '2026-11-01']]) expect(() => validateCsvSelection({ kind: 'range', from, to })).toThrow();
});
