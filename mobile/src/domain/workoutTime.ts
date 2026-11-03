import type { WorkoutDraft } from './workout.ts';

export function timeFields(iso: string, timezone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(iso));
  const value = (type: string) => parts.find(part => part.type === type)!.value;
  return { date: `${value('year')}-${value('month')}-${value('day')}`, time: `${value('hour')}:${value('minute')}` };
}

export function initialTiming(draft: WorkoutDraft, now: string) {
  if (draft.timing) return draft.timing;
  const start = timeFields(draft.startedAt, draft.timezone);
  const end = timeFields(draft.endedAt ?? now, draft.timezone);
  return { startDate: start.date, startTime: start.time, endDate: end.date, endTime: end.time };
}

function instant(date: string, time: string, timezone: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) throw new Error('Enter dates as YYYY-MM-DD and times as HH:mm (24-hour).');
  const wall = Date.parse(`${date}T${time}:00Z`);
  if (!Number.isFinite(wall)) throw new Error('Enter a valid workout date and time.');
  let result = wall;
  for (let i = 0; i < 3; i++) {
    const shown = timeFields(new Date(result).toISOString(), timezone);
    result += wall - Date.parse(`${shown.date}T${shown.time}:00Z`);
  }
  const shown = timeFields(new Date(result).toISOString(), timezone);
  if (shown.date !== date || shown.time !== time) throw new Error('Enter a valid date and time in the workout timezone.');
  return new Date(result).toISOString();
}

export function workoutTimes(draft: WorkoutDraft, now: string) {
  if (!draft.timing) return { activityDate: draft.activityDate, startedAt: draft.startedAt, endedAt: draft.endedAt ?? now };
  const { startDate, startTime, endDate, endTime } = draft.timing;
  const startedAt = instant(startDate, startTime, draft.timezone);
  const endedAt = instant(endDate, endTime, draft.timezone);
  if (endedAt < startedAt) throw new Error('Enter an end date and time at or after the start.');
  if (Date.parse(endedAt) > Date.parse(now)) throw new Error('Enter a workout date and time that is not in the future.');
  return { activityDate: startDate, startedAt, endedAt };
}
