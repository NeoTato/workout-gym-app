import type { Convention, LoadUnit } from './workout.ts';

export type ProgressRow = {
  exerciseId: string; exerciseName: string; variationId: string; locationId: string; locationName: string; archived: number;
  equipment: string; bodyweight: number; dimension: 'mass' | 'plates' | 'bodyweight'; convention: Convention;
  workoutId: string; activityDate: string; startedAt: string; sessionType: string;
  setId: string; weight: number | null; reps: number; unit: LoadUnit;
};
export type ProgressSession = Pick<ProgressRow, 'workoutId' | 'activityDate' | 'startedAt' | 'sessionType'> & {
  sets: { id: string; weight: number | null; reps: number; unit: LoadUnit }[];
};
export type ProgressVariation = Pick<ProgressRow, 'variationId' | 'locationId' | 'locationName' | 'equipment' | 'dimension' | 'convention'> & {
  bodyweight: boolean; archived: boolean; sessions: ProgressSession[];
};

export function buildExerciseProgress(rows: ProgressRow[]): ProgressVariation[] {
  const variations = new Map<string, ProgressVariation>();
  const sessions = new Map<string, Map<string, ProgressSession>>();
  // Sort a copy; the first row supplies the latest recorded location snapshot.
  const sorted = [...rows].sort((a, b) => b.activityDate.localeCompare(a.activityDate) || b.startedAt.localeCompare(a.startedAt) || b.workoutId.localeCompare(a.workoutId));
  for (const row of sorted) {
    let variation = variations.get(row.variationId);
    if (!variation) {
      variation = { variationId: row.variationId, locationId: row.locationId, locationName: row.locationName, equipment: row.equipment, dimension: row.dimension, convention: row.convention, bodyweight: Boolean(row.bodyweight), archived: Boolean(row.archived), sessions: [] };
      variations.set(row.variationId, variation); sessions.set(row.variationId, new Map());
    }
    const byWorkout = sessions.get(row.variationId)!;
    let session = byWorkout.get(row.workoutId);
    if (!session) {
      session = { workoutId: row.workoutId, activityDate: row.activityDate, startedAt: row.startedAt, sessionType: row.sessionType, sets: [] };
      byWorkout.set(row.workoutId, session); variation.sessions.push(session);
    }
    session.sets.push({ id: row.setId, weight: row.weight, reps: row.reps, unit: row.unit });
  }
  return Array.from(variations.values());
}

export function progressMetrics(variation: ProgressVariation, displayUnit: 'lb' | 'kg') {
  const unit = variation.bodyweight ? 'reps' : variation.dimension === 'plates' ? 'plates' : displayUnit;
  const points = variation.sessions.map(session => {
    const values = session.sets.map(set => variation.bodyweight ? set.reps : set.weight === null ? 0 : variation.dimension === 'plates' || set.unit === displayUnit ? set.weight : displayUnit === 'kg' ? set.weight * 0.45359237 : set.weight / 0.45359237);
    return { workoutId: session.workoutId, date: session.activityDate, value: Math.max(0, ...values) };
  });
  return { unit, best: points.length ? Math.max(...points.map(point => point.value)) : null, points: points.slice(0, 12).reverse() };
}

export function formatProgressValue(value: number): string {
  return Number(value.toFixed(2)).toString();
}
