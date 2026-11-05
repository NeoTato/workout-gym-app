import { calendarMonth, shiftCalendarMonth, workoutsInMonth } from '../workoutCalendar';
import type { WorkoutListItem } from '../workout';

it('builds Monday-first leap-year grids and crosses year boundaries', () => {
  const grid = calendarMonth('2024-02');
  expect(grid.slice(0, 4)).toEqual([null, null, null, '2024-02-01']);
  expect(grid.filter(Boolean)).toHaveLength(29);
  expect(grid.length % 7).toBe(0);
  expect(shiftCalendarMonth('2026-12', 1)).toBe('2027-01');
  expect(shiftCalendarMonth('2026-01', -1)).toBe('2025-12');
  expect(shiftCalendarMonth('0001-01', -1)).toBeNull();
  expect(() => calendarMonth('2026-13')).toThrow();
});

it('groups completed summaries by recorded date and location kind, including multiple sessions per date', () => {
  const base: WorkoutListItem = { id: 'gym', activityDate: '2026-11-05', startedAt: '2026-11-04T23:30:00Z', endedAt: '2026-11-05T01:00:00Z', timezone: 'Asia/Manila', locationId: 'gym', locationName: 'Old gym', locationKind: 'gym', sessionType: 'Push' };
  const items = [base, { ...base, id: 'home', locationId: 'home', locationName: 'Home', locationKind: 'home' as const, sessionType: 'Core' }, { ...base, id: 'other', activityDate: '2026-10-31' }];
  expect(workoutsInMonth(items, '2026-11', 'all')).toHaveLength(2);
  expect(workoutsInMonth(items, '2026-11', 'gym').map(item => item.id)).toEqual(['gym']);
  expect(workoutsInMonth(items, '2026-11', 'home').map(item => item.id)).toEqual(['home']);
  expect(workoutsInMonth(items, '2026-12', 'all')).toEqual([]);
});
