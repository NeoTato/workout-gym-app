import { buildExerciseProgress, progressMetrics, type ProgressRow } from '../exerciseProgress';

const row: ProgressRow = { exerciseId: 'exercise', exerciseName: 'Press', variationId: 'variation', locationId: 'home', locationName: 'Home', archived: 0, equipment: 'Dumbbells', bodyweight: 0, dimension: 'mass', convention: 'per_hand', workoutId: 'session', activityDate: '2026-11-01', startedAt: '2026-11-01T01:00:00Z', sessionType: 'Push', setId: 'set', weight: 100, reps: 8, unit: 'lb' };

it('keeps equipment identities separate and merges repeated exercises within a single session', () => {
  const result = buildExerciseProgress([row, { ...row, setId: 'second', weight: 50, unit: 'kg' }, { ...row, variationId: 'gym-variation', locationId: 'gym', locationName: 'Gym B', archived: 1 }, { ...row, variationId: 'plates', dimension: 'plates', unit: 'plates' }]);
  expect(result).toHaveLength(3);
  expect(result[0].sessions).toHaveLength(1);
  expect(result[0].sessions[0].sets.map(set => set.unit)).toEqual(['lb', 'kg']);
  expect(result[1].archived).toBe(true);
  const metrics = progressMetrics(result[0], 'lb');
  expect(metrics.best).toBeCloseTo(110.231131);
  expect(progressMetrics(result[0], 'kg').best).toBe(50);
  expect(progressMetrics(result[2], 'kg').unit).toBe('plates');
});

it('orders backdated sessions chronologically, retains zero loads, and charts reps for bodyweight', () => {
  const data = buildExerciseProgress([{ ...row, workoutId: 'later', activityDate: '2026-11-03', weight: 0 }, row])[0];
  expect(data.sessions.map(session => session.workoutId)).toEqual(['later', 'session']);
  expect(progressMetrics(data, 'lb').points.map(point => point.value)).toEqual([100, 0]);
  const bodyweight = buildExerciseProgress([{ ...row, bodyweight: 1, dimension: 'bodyweight', weight: null, reps: 12 }])[0];
  expect(progressMetrics(bodyweight, 'kg')).toMatchObject({ unit: 'reps', best: 12 });
  expect(buildExerciseProgress([])).toEqual([]);
});

it('limits the chart to twelve sessions without limiting the all-time record or mutating inputs', () => {
  const rows = Array.from({ length: 15 }, (_, index) => ({ ...row, workoutId: `session-${index}`, setId: `set-${index}`, activityDate: `2026-10-${String(index + 1).padStart(2, '0')}`, weight: index === 0 ? 200 : index }));
  const snapshot = JSON.stringify(rows), variation = buildExerciseProgress(rows)[0], metrics = progressMetrics(variation, 'lb');
  expect(metrics.best).toBe(200); expect(metrics.points).toHaveLength(12);
  expect(metrics.points[0].date).toBe('2026-10-04'); expect(metrics.points[11].date).toBe('2026-10-15');
  expect(variation.sessions).toHaveLength(15); expect(JSON.stringify(rows)).toBe(snapshot);
});
