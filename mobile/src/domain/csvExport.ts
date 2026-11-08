import { activityDateValue } from './workoutCalendar.ts';

export const CSV_HEADER = 'record_type,session_id,activity_date,timezone,started_at,ended_at,session_type_id,session_type,routine,gym_or_home,location_id,location_kind,exercise_id,exercise,equipment_id,equipment,measurement_mode,load_convention,set_number,load_value,load_unit,reps,duration_seconds,distance_meters,session_duration_seconds,session_notes,exercise_notes,set_notes'.split(',');
export type CsvSelection = { kind: 'all' } | { kind: 'range'; from: string; to: string };
export type CsvRow = {
  sessionId: string; activityDate: string; timezone: string; startedAt: string; endedAt: string;
  sessionType: string; locationId: string; locationName: string; locationKind: string;
  exerciseId: string | null; exerciseName: string | null; equipmentId: string | null; equipmentName: string | null;
  bodyweight: number | null; loadConvention: string | null; loadUnit: string | null;
  measurementMode?: string | null; durationSeconds?: number | null; distanceMeters?: number | null;
  setId: string | null; setPosition: number | null; loadValue: number | null; reps: number | null;
};

export function validateCsvSelection(selection: CsvSelection): CsvSelection {
  if (selection.kind === 'all') return { kind: 'all' };
  if (selection.kind !== 'range') throw new Error('Choose all history or a date range.');
  activityDateValue(selection.from); activityDateValue(selection.to);
  if (selection.from > selection.to) throw new Error('Choose an end date on or after the start date.');
  return { kind: 'range', from: selection.from, to: selection.to };
}
export function csvText(value: string): string {
  const leading = value.match(/^[\s\p{Cc}\uFEFF]*/u)?.[0] ?? '';
  const prefixed = /\p{Cc}/u.test(leading) || /^[=+\-@＝＋－＠]/u.test(value.slice(leading.length)) ? "'" + value : value;
  return '"' + prefixed.replace(/"/g, '""') + '"';
}
function cell(value: string | number | null): string {
  if (value === null) return '';
  if (typeof value === 'string') return csvText(value);
  if (!Number.isFinite(value) || value < 0) throw new Error('A saved workout contains an invalid measurement. Review it before exporting.');
  return String(value);
}
export function buildCsvExport(rows: CsvRow[]) {
  const sessions = new Set<string>(), days = new Set<string>();
  let sets = 0;
  const lines = [CSV_HEADER.join(',')];
  for (const row of rows) {
    const hasSet = row.setId !== null;
    const position = row.setPosition, reps = row.reps, mode = row.measurementMode ?? (row.bodyweight ? 'reps' : 'load_reps');
    const timed = mode === 'duration' || mode === 'distance_duration';
    if (hasSet && ((!timed && (reps === null || !Number.isSafeInteger(reps) || reps <= 0)) || (timed && (!Number.isSafeInteger(row.durationSeconds) || (row.durationSeconds ?? 0) <= 0 || mode === 'distance_duration' && (row.distanceMeters ?? 0) <= 0)) || position === null || !Number.isSafeInteger(position) || position < 0 || mode === 'load_reps' && row.loadValue === null)) throw new Error('A saved set has incomplete measurements. Review it before exporting.');
    const duration = (Date.parse(row.endedAt) - Date.parse(row.startedAt)) / 1000;
    sessions.add(row.sessionId); days.add(row.activityDate); if (hasSet) sets++;
    // Unsupported provenance/notes remain empty. CSV reports
    // stored labels and original units; it never guesses missing app fields.
    lines.push([
      hasSet ? 'set' : 'session', row.sessionId, row.activityDate, row.timezone, row.startedAt, row.endedAt, '', row.sessionType, '', row.locationName, row.locationId, row.locationKind,
      row.exerciseId ?? '', row.exerciseName ?? '', row.equipmentId ?? '', row.equipmentName ?? '', hasSet ? mode : '', hasSet && mode === 'load_reps' ? row.loadConvention ?? '' : '',
      hasSet && position !== null ? position + 1 : null, hasSet && mode === 'load_reps' ? row.loadValue : null, hasSet && mode === 'load_reps' ? row.loadUnit ?? '' : '', hasSet ? reps : null,
      hasSet && timed ? row.durationSeconds ?? null : null, hasSet && mode === 'distance_duration' ? row.distanceMeters ?? null : null, duration, '', '', '',
    ].map(cell).join(','));
  }
  const dates = [...days].sort();
  return { text: '\uFEFF' + lines.join('\r\n') + '\r\n', summary: { workouts: sessions.size, sets, activeDays: days.size, firstDate: dates[0] ?? null, lastDate: dates.at(-1) ?? null } };
}
export type CsvExport = ReturnType<typeof buildCsvExport>;
