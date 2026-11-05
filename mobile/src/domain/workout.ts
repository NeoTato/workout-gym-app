import { cleanExerciseName, exerciseCategories, subcategoriesFor, type ExerciseCategory, type ExerciseSubcategory } from './exerciseLibrary.ts';

export type LoadUnit = 'lb' | 'kg' | 'plates';
export type Convention = 'total' | 'per_hand' | 'per_side';
export type SetDraft = { id: string; weight: string; reps: string; completed: boolean };
export type ExerciseDraft = {
  catalogId?: string;
  category?: ExerciseCategory;
  subcategory?: ExerciseSubcategory;
  id: string; name: string; equipment: string; bodyweight: boolean;
  unit: LoadUnit; convention: Convention; sets: SetDraft[];
};
export type WorkoutDraft = {
  id: string; startedAt: string; activityDate: string; timezone: string;
  endedAt?: string;
  setupComplete?: boolean;
  timing?: { startDate: string; startTime: string; endDate: string; endTime: string };
  locationId: string; sessionType: string; exercises: ExerciseDraft[];
};
export type CompletedExercise = Omit<ExerciseDraft, 'sets'> & {
  sets: { id: string; weight: number | null; reps: number }[];
};
export type Location = { id: string; name: string; kind: 'gym' | 'home'; archived?: number };
export type SavedWorkout = {
  id: string; activityDate: string; sessionType: string; locationName: string;
  timezone: string;
  startedAt: string; endedAt: string; exercises: CompletedExercise[];
};
export const sessionTypes = ['Push', 'Pull', 'Legs', 'Upper', 'Lower', 'Full Body', 'Core', 'Custom'];

export function localDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function validReps(reps: string): boolean {
  return /^\d+$/.test(reps.trim()) && Number.isSafeInteger(Number(reps)) && Number(reps) > 0;
}

function validLoad(weight: string): boolean {
  return /^(?:\d+(?:\.\d*)?|\.\d+)$/.test(weight.trim()) && Number.isFinite(Number(weight));
}

export function canCompleteSet(set: Pick<SetDraft, 'weight' | 'reps'>, bodyweight: boolean): boolean {
  return validReps(set.reps) && (bodyweight || validLoad(set.weight));
}

export function completedExercises(draft: WorkoutDraft): CompletedExercise[] {
  if (!draft.locationId) throw new Error('Choose your gym or Home.');
  if (!sessionTypes.includes(draft.sessionType)) throw new Error('Choose a session type.');
  const result: CompletedExercise[] = [];
  for (const exercise of draft.exercises) {
    const sets = exercise.sets.filter(set => set.completed);
    if (!sets.length) continue;
    if (!exercise.name.trim()) throw new Error('Name each exercise with completed sets.');
    if (exercise.category !== undefined && exercise.category !== '' && !exerciseCategories.includes(exercise.category)) {
      throw new Error('Choose a valid exercise category.');
    }
    if (exercise.subcategory !== undefined && exercise.subcategory !== '' && !subcategoriesFor(exercise.category ?? '').includes(exercise.subcategory)) {
      throw new Error('Choose a subcategory that belongs to the exercise category.');
    }
    if (!['lb', 'kg', 'plates'].includes(exercise.unit) || !['total', 'per_hand', 'per_side'].includes(exercise.convention)) {
      throw new Error('Choose a valid unit and load convention.');
    }
    result.push({ ...exercise, name: cleanExerciseName(exercise.name), equipment: exercise.equipment.trim(), sets: sets.map(set => {
      if (!validReps(set.reps)) {
        throw new Error(`${exercise.name}: enter a positive whole number of reps for each completed set.`);
      }
      const value = Number(set.weight);
      if (!exercise.bodyweight && !validLoad(set.weight)) {
        throw new Error(`${exercise.name}: enter a valid nonnegative load for each completed set.`);
      }
      return { id: set.id, weight: exercise.bodyweight ? null : value, reps: Number(set.reps) };
    }) });
  }
  if (!result.length) throw new Error('Mark at least one set done before finishing.');
  return result;
}
