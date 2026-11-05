import { periodBounds, shiftSummaryPeriod, summarizePeriod } from '../workoutSummary';
import type { WorkoutListItem } from '../workout';

const workout: WorkoutListItem = { id: 'push', activityDate: '2026-11-05', startedAt: '2026-11-05T01:00:00Z', endedAt: '2026-11-05T02:00:00Z', timezone: 'Asia/Manila', sessionType: 'Push', locationId: 'gym', locationKind: 'gym', locationName: 'Gym A' };

it('uses Monday weeks and real calendar bounds across years and leap days', () => {
  expect(periodBounds('week', '2026-01-01')).toEqual({ start: '2025-12-29', end: '2026-01-04' });
  expect(periodBounds('month', '2024-02-29')).toEqual({ start: '2024-02-01', end: '2024-02-29' });
  expect(shiftSummaryPeriod('month', '2026-12-31', 1)).toBe('2027-01-01');
  expect(shiftSummaryPeriod('year', '0001-01-01', -1)).toBeNull();
});

it('conserves workout/type/location totals, distinguishes active dates, and deduplicates exercise groups', () => {
  const items = [workout, { ...workout, id: 'core', sessionType: 'Core', locationKind: 'home' as const, locationId: 'home' }, { ...workout, id: 'legs', sessionType: 'Legs', activityDate: '2026-11-02', endedAt: 'invalid' }];
  const result = summarizePeriod('month', '2026-11-05', '2026-11-05', items, [{ sessionId: 'push', group: 'Chest' }, { sessionId: 'push', group: 'Chest' }, { sessionId: 'push', group: 'Triceps' }, { sessionId: 'core', group: 'Core' }]);
  expect(result.sessions).toBe(3); expect(result.activeDays).toBe(2);
  expect(result.recordedSeconds).toBe(7200); expect(result.missingDurationSessions).toBe(1);
  expect(result.typeCounts.find(item => item.name === 'Push')?.count).toBe(1);
  expect(result.typeCounts.reduce((total, item) => total + item.count, 0)).toBe(3);
  expect(result.locationCounts).toEqual({ gym: 2, home: 1 });
  expect(result.exerciseGroups.find(item => item.name === 'Chest')?.count).toBe(1);
  expect(result.status).toBe('current');
  expect(result.activity.reduce((sum, item) => sum + item.sessions, 0)).toBe(3);
  expect(result.activity.reduce((sum, item) => sum + item.activeDays, 0)).toBe(2);
  const mixed = summarizePeriod('month', '2026-11-05', '2026-11-05', [workout], [{ sessionId: 'push', group: 'Core' }]);
  expect(mixed.typeCounts.find(item => item.name === 'Core')?.count).toBe(0);
  expect(mixed.exerciseGroups.find(item => item.name === 'Core')?.count).toBe(1);
});

it('omits future activity, handles empty periods, and builds all twelve annual months', () => {
  const future = summarizePeriod('month', '2026-12-01', '2026-11-05', [{ ...workout, activityDate: '2026-12-01' }], []);
  expect(future.status).toBe('future'); expect(future.sessions).toBe(0);
  const annual = summarizePeriod('year', '2026-11-05', '2026-11-05', [workout, { ...workout, id: 'future', activityDate: '2026-11-06' }], []);
  expect(annual.activity).toHaveLength(12); expect(annual.sessions).toBe(1);
  expect(summarizePeriod('week', '2026-10-01', '2026-11-05', [], []).status).toBe('past');
});
