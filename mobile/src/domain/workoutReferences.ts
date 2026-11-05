import type { CompletedExercise, WorkoutDraft } from './workout.ts';
import { workoutTimes } from './workoutTime.ts';

export type ReferenceContext = { locationId: string; activityDate: string; startedAt: string; excludeSessionId: string };
export type PreviousExercise = { workoutId: string; activityDate: string; sessionType: string; locationName: string; exercise: CompletedExercise };

export function referenceContext(draft: WorkoutDraft, now: string): ReferenceContext {
  const times = workoutTimes(draft, now);
  return { locationId: draft.locationId, activityDate: times.activityDate, startedAt: times.startedAt, excludeSessionId: draft.id };
}
