import { calculateConsistency, consistencyForPeriod } from '../weeklyGoals';

const goals = [{ effectiveWeekStart: '2026-10-12', targetDays: 3 }, { effectiveWeekStart: '2026-11-02', targetDays: 2 }, { effectiveWeekStart: '2026-11-09', targetDays: 4 }];
const dates = ['2026-10-19', '2026-10-20', '2026-10-21', '2026-10-26', '2026-10-27', '2026-10-28', '2026-11-02', '2026-11-02'];

it('keeps an open unmet week from breaking the streak and counts distinct dates only', () => {
  const result = calculateConsistency(dates, goals, '2026-11-05');
  expect(result.currentWeek.activeDays).toBe(1); expect(result.currentWeek.targetDays).toBe(2);
  expect(result.currentWeek.status).toBe('in_progress'); expect(result.currentStreak).toBe(2); expect(result.longestStreak).toBe(2);
  expect(result.pendingGoal?.targetDays).toBe(4);
  const achieved = calculateConsistency([...dates, '2026-11-03', '2026-11-06'], goals, '2026-11-05');
  expect(achieved.currentWeek.activeDays).toBe(2); expect(achieved.currentStreak).toBe(3); expect(achieved.longestStreak).toBe(3);
});

it('breaks streaks on closed unmet or missing weeks while keeping effective targets historical', () => {
  const result = calculateConsistency([...dates, '2026-11-03'], goals, '2026-11-16');
  expect(result.currentStreak).toBe(0); expect(result.longestStreak).toBe(3);
  expect(result.recentWeeks.find(item => item.start === '2026-10-26')?.targetDays).toBe(3);
  expect(result.recentWeeks.find(item => item.start === '2026-11-09')?.status).toBe('missed');
  expect(calculateConsistency(['2026-10-19', '2026-10-20', '2026-10-21'], goals, '2026-11-05').currentStreak).toBe(0);
});

it('handles empty/pre-goal activity and full weeks intersecting a month or year', () => {
  expect(calculateConsistency([], goals, '2026-11-05').currentStreak).toBe(0);
  const history = [{ effectiveWeekStart: '2026-01-05', targetDays: 3 }];
  const oldDates = ['2025-12-29', '2025-12-30', '2025-12-31', '2026-01-05', '2026-01-06', '2026-01-07'];
  const year = consistencyForPeriod('year', '2026-01-01', oldDates, history, '2026-01-08');
  expect(year.longestStreak).toBe(2); expect(year.achievedWeeks).toBe(2);
  expect(year.weeks[0].start).toBe('2025-12-29');
  expect(consistencyForPeriod('month', '2026-01-01', oldDates, history, '2026-01-08').weeks[0].targetDays).toBe(3);
  expect(() => calculateConsistency([], [], '2026-11-05')).toThrow(/goal/i);
  const future = consistencyForPeriod('year', '2026-01-01', ['2025-12-31'], [{ effectiveWeekStart: '2025-12-29', targetDays: 1 }], '2025-12-31');
  expect(future.achievedWeeks).toBe(0); expect(future.longestStreak).toBe(0); expect(future.weeks.every(week => week.status === 'future')).toBe(true);
});
