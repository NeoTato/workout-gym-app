import { activityDateValue } from './workoutCalendar.ts';
import { periodBounds, shiftSummaryPeriod, type SummaryPeriod } from './workoutSummary.ts';

export type WeeklyGoal = { effectiveWeekStart: string; targetDays: number };
export type WeekProgress = { start: string; end: string; targetDays: number; activeDays: number; status: 'achieved' | 'in_progress' | 'missed' | 'future' | 'not_started' };
export type WeeklyConsistency = ReturnType<typeof calculateConsistency>;
export type PeriodConsistency = ReturnType<typeof consistencyForPeriod>;

function sortedGoals(goals: WeeklyGoal[]): WeeklyGoal[] {
  if (!goals.length) throw new Error('Weekly goal history is missing.');
  const result = [...goals].sort((a, b) => a.effectiveWeekStart.localeCompare(b.effectiveWeekStart));
  for (const [index, goal] of result.entries()) {
    if (!Number.isInteger(goal.targetDays) || goal.targetDays < 1 || goal.targetDays > 7
      || periodBounds('week', goal.effectiveWeekStart).start !== goal.effectiveWeekStart
      || result[index - 1]?.effectiveWeekStart === goal.effectiveWeekStart) throw new Error('Weekly goal history is invalid.');
  }
  return result;
}
function targetFor(goals: WeeklyGoal[], start: string): number {
  let target = goals[0].targetDays;
  for (const goal of goals) { if (goal.effectiveWeekStart > start) break; target = goal.targetDays; }
  return target;
}
export function effectiveWeeklyTarget(goals: WeeklyGoal[], date: string): number {
  return targetFor(sortedGoals(goals), periodBounds('week', date).start);
}
function prepare(dates: string[], goals: WeeklyGoal[], asOf: string) {
  activityDateValue(asOf);
  const history = sortedGoals(goals), currentStart = periodBounds('week', asOf).start;
  const activity = new Map<string, Set<string>>();
  for (const date of dates) {
    activityDateValue(date); if (date > asOf) continue;
    const start = periodBounds('week', date).start, days = activity.get(start) ?? new Set<string>(); days.add(date); activity.set(start, days);
  }
  const starts = Array.from(activity.keys()).sort(), first = starts[0] ?? currentStart;
  function week(start: string): WeekProgress {
    const bounds = periodBounds('week', start), targetDays = targetFor(history, start), activeDays = activity.get(start)?.size ?? 0;
    const status = start > currentStart ? 'future' : start < first ? 'not_started' : activeDays >= targetDays ? 'achieved' : start === currentStart ? 'in_progress' : 'missed';
    return { ...bounds, targetDays, activeDays, status };
  }
  return { history, starts, first, currentStart, week };
}
function streakRuns(starts: string[], week: (start: string) => WeekProgress) {
  let run = 0, longest = 0, previous: string | null = null;
  const runs = new Map<string, number>();
  for (const start of starts) {
    if (week(start).status === 'achieved') run = previous && shiftSummaryPeriod('week', previous, 1) === start ? run + 1 : 1; else run = 0;
    longest = Math.max(longest, run); runs.set(start, run); previous = start;
  }
  return { longest, runs };
}
export function calculateConsistency(dates: string[], goals: WeeklyGoal[], asOf: string) {
  const data = prepare(dates, goals, asOf), currentWeek = data.week(data.currentStart);
  const { longest, runs } = streakRuns(data.starts, data.week);
  const previous = shiftSummaryPeriod('week', data.currentStart, -1), next = shiftSummaryPeriod('week', data.currentStart, 1);
  const currentStreak = currentWeek.status === 'achieved' ? runs.get(data.currentStart) ?? 0 : previous ? runs.get(previous) ?? 0 : 0;
  const recentWeeks: WeekProgress[] = [];
  let cursor: string | null = data.currentStart;
  for (let count = 0; count < 8 && cursor && cursor >= data.first; count++) { recentWeeks.push(data.week(cursor)); cursor = shiftSummaryPeriod('week', cursor, -1); }
  return { currentWeek, currentStreak, longestStreak: longest, recentWeeks, pendingGoal: data.history.find(goal => goal.effectiveWeekStart === next) ?? null };
}
export function consistencyForPeriod(kind: SummaryPeriod, anchor: string, dates: string[], goals: WeeklyGoal[], asOf: string) {
  const data = prepare(dates, goals, asOf), bounds = periodBounds(kind, anchor);
  const week = bounds.start > asOf ? (start: string): WeekProgress => ({ ...data.week(start), activeDays: 0, status: 'future' }) : data.week;
  const weeks: WeekProgress[] = [];
  let cursor: string | null = periodBounds('week', bounds.start).start;
  while (cursor && cursor <= bounds.end) { weeks.push(week(cursor)); cursor = shiftSummaryPeriod('week', cursor, 1); }
  return { weeks, achievedWeeks: weeks.filter(week => week.status === 'achieved').length, longestStreak: streakRuns(weeks.map(week => week.start), week).longest };
}
