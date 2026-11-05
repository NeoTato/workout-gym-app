import type { CompletedExercise, ExerciseDraft, WorkoutDraft } from './workout.ts';
import { workoutTimes } from './workoutTime.ts';

export type ReferenceContext = { locationId: string; activityDate: string; startedAt: string; excludeSessionId: string };
export type PreviousExercise = { workoutId: string; activityDate: string; sessionType: string; locationName: string; exercise: CompletedExercise };
export type ReferenceExercise = Pick<ExerciseDraft, 'catalogId' | 'name' | 'equipment' | 'bodyweight' | 'unit' | 'convention'>;

export function referenceContext(draft: WorkoutDraft, now: string): ReferenceContext {
  const times = workoutTimes(draft, now);
  return { locationId: draft.locationId, activityDate: times.activityDate, startedAt: times.startedAt, excludeSessionId: draft.id };
}

export function validReferenceContext(draft: WorkoutDraft): ReferenceContext | null {
  if (!draft.locationId) return null;
  try { return referenceContext(draft, new Date().toISOString()); } catch { return null; }
}
