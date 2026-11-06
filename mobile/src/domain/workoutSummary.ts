import { localDate, sessionTypes, type WorkoutListItem } from './workout.ts';
import { activityDateValue } from './workoutCalendar.ts';
import type { PeriodConsistency } from './weeklyGoals.ts';

export type SummaryPeriod = 'week' | 'month' | 'year';
export type WorkoutCoverage = { sessionId: string; group: string };
export type PeriodSummary = ReturnType<typeof summarizePeriod> & { consistency?: PeriodConsistency };

function dateKey(date: Date): string {
  return `${String(date.getUTCFullYear()).padStart(4, '0')}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}
function plusDays(date: string, days: number): string {
  const value = activityDateValue(date); value.setUTCDate(value.getUTCDate() + days); return dateKey(value);
}
export function periodBounds(kind: SummaryPeriod, anchor: string): { start: string; end: string } {
  if (!['week', 'month', 'year'].includes(kind)) throw new Error('Choose a valid summary period.');
  const start = activityDateValue(anchor), end = new Date(start);
  if (kind === 'week') {
    start.setUTCDate(start.getUTCDate() - (start.getUTCDay() + 6) % 7); end.setTime(start.getTime()); end.setUTCDate(end.getUTCDate() + 6);
  } else if (kind === 'month') {
    start.setUTCDate(1); end.setUTCMonth(end.getUTCMonth() + 1, 0);
  } else { start.setUTCMonth(0, 1); end.setUTCMonth(11, 31); }
  return { start: start.getUTCFullYear() < 1 ? '0001-01-01' : dateKey(start), end: end.getUTCFullYear() > 9999 ? '9999-12-31' : dateKey(end) };
}
export function shiftSummaryPeriod(kind: SummaryPeriod, anchor: string, direction: -1 | 1): string | null {
  const value = activityDateValue(periodBounds(kind, anchor).start);
  if (kind === 'week') value.setUTCDate(value.getUTCDate() + direction * 7);
  else if (kind === 'month') value.setUTCMonth(value.getUTCMonth() + direction);
  else value.setUTCFullYear(value.getUTCFullYear() + direction);
  return value.getUTCFullYear() < 1 || value.getUTCFullYear() > 9999 ? null : dateKey(value);
}
function label(date: string, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat('en', { ...options, timeZone: 'UTC' }).format(activityDateValue(date));
}
export function summaryPeriodLabel(kind: SummaryPeriod, anchor: string): string {
  const { start, end } = periodBounds(kind, anchor);
  if (kind === 'year') return start.slice(0, 4);
  if (kind === 'month') return label(start, { month: 'long', year: 'numeric' });
  return `${label(start, { month: 'short', day: 'numeric', ...(start.slice(0, 4) !== end.slice(0, 4) ? { year: 'numeric' } : {}) })} – ${label(end, { month: 'short', day: 'numeric', year: 'numeric' })}`;
}
export function formatRecordedTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60), hours = Math.floor(minutes / 60);
  return hours ? `${hours} hr${minutes % 60 ? ` ${minutes % 60} min` : ''}` : seconds > 0 && minutes === 0 ? '<1 min' : `${minutes} min`;
}
export function summarizePeriod(kind: SummaryPeriod, anchor: string, today = localDate(new Date()), workouts: WorkoutListItem[], coverage: WorkoutCoverage[]) {
  activityDateValue(today);
  const bounds = periodBounds(kind, anchor);
  const status: 'future' | 'past' | 'current' = bounds.start > today ? 'future' : bounds.end < today ? 'past' : 'current';
  const items = workouts.filter(item => item.activityDate >= bounds.start && item.activityDate <= bounds.end && item.activityDate <= today);
  const types = new Map<string, number>(sessionTypes.map(type => [type, 0]));
  const locationCounts = { gym: 0, home: 0 };
  let recordedSeconds = 0, missingDurationSessions = 0;
  for (const item of items) {
    types.set(item.sessionType, (types.get(item.sessionType) ?? 0) + 1);
    if (!['gym', 'home'].includes(item.locationKind)) throw new Error('This workout location could not be read.');
    locationCounts[item.locationKind]++;
    const duration = Date.parse(item.endedAt) - Date.parse(item.startedAt);
    if (Number.isFinite(duration) && duration >= 0) recordedSeconds += Math.floor(duration / 1000); else missingDurationSessions++;
  }
  const included = new Set(items.map(item => item.id)), groups = new Map<string, Set<string>>();
  for (const item of coverage) if (included.has(item.sessionId) && item.group) {
    const sessions = groups.get(item.group) ?? new Set<string>(); sessions.add(item.sessionId); groups.set(item.group, sessions);
  }
  const buckets: { start: string; end: string; label: string }[] = [];
  if (kind === 'year') {
    for (let month = 1; month <= 12; month++) { const start = `${bounds.start.slice(0, 4)}-${String(month).padStart(2, '0')}-01`; buckets.push({ ...periodBounds('month', start), label: label(start, { month: 'short' }) }); }
  } else if (kind === 'week') {
    for (let date = bounds.start; date <= bounds.end; date = plusDays(date, 1)) {
      buckets.push({ start: date, end: date, label: label(date, { weekday: 'short' }) }); if (date === bounds.end) break;
    }
  } else {
    for (let date = bounds.start; date <= bounds.end;) {
      const end = periodBounds('week', date).end < bounds.end ? periodBounds('week', date).end : bounds.end;
      buckets.push({ start: date, end, label: date === end ? label(date, { month: 'short', day: 'numeric' }) : `${label(date, { month: 'short', day: 'numeric' })} – ${label(end, { month: 'short', day: 'numeric' })}` });
      if (end === bounds.end) break; date = plusDays(end, 1);
    }
  }
  const activity = buckets.map(bucket => { const records = items.filter(item => item.activityDate >= bucket.start && item.activityDate <= bucket.end); return { ...bucket, sessions: records.length, activeDays: new Set(records.map(item => item.activityDate)).size }; });
  return { ...bounds, kind, status, sessions: items.length, activeDays: new Set(items.map(item => item.activityDate)).size, recordedSeconds, missingDurationSessions,
    typeCounts: Array.from(types, ([name, count]) => ({ name, count })), locationCounts,
    exerciseGroups: Array.from(groups, ([name, sessions]) => ({ name, count: sessions.size })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)), activity };
}
