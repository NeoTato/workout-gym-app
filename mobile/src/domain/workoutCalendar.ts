import type { WorkoutListItem } from './workout.ts';

export type LocationFilter = 'all' | 'gym' | 'home';
export function activityDateValue(date: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Choose a valid calendar date.');
  const parsed = new Date(`${date}T12:00:00Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.getUTCFullYear() < 1 || parsed.toISOString().slice(0, 10) !== date) throw new Error('Choose a valid calendar date.');
  return parsed;
}
export function calendarMonth(month: string): (string | null)[] {
  const first = activityDateValue(`${month}-01`);
  const leading = (first.getUTCDay() + 6) % 7;
  const last = new Date(first); last.setUTCMonth(last.getUTCMonth() + 1); last.setUTCDate(0);
  const count = last.getUTCDate(), length = Math.ceil((leading + count) / 7) * 7;
  return Array.from({ length }, (_, index) => index < leading || index >= leading + count ? null : `${month}-${String(index - leading + 1).padStart(2, '0')}`);
}
export function shiftCalendarMonth(month: string, amount: -1 | 1): string | null {
  const date = activityDateValue(`${month}-01`); date.setUTCMonth(date.getUTCMonth() + amount);
  const year = date.getUTCFullYear();
  return year < 1 || year > 9999 ? null : `${String(year).padStart(4, '0')}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}
export function workoutsInMonth(items: WorkoutListItem[], month: string, filter: LocationFilter): WorkoutListItem[] {
  activityDateValue(`${month}-01`);
  return items.filter(item => item.activityDate.startsWith(`${month}-`) && (filter === 'all' || item.locationKind === filter));
}
export function calendarDateLabel(date: string): string {
  return new Intl.DateTimeFormat('en', { timeZone: 'UTC', weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(activityDateValue(date));
}
