import type { ExerciseDraft, SavedWorkout, WorkoutDraft } from './workout.ts';

export type RoutineExercise = Omit<ExerciseDraft, 'id' | 'sets'> & { catalogId: string; setCount: number };
export type Routine = { id: string; name: string; sessionType: string; locationId: string; locationName: string; exercises: RoutineExercise[] };

export function routineExercises(workout: SavedWorkout): RoutineExercise[] {
  return workout.exercises.map(exercise => {
    if (!exercise.catalogId) throw new Error('This saved exercise identity could not be read.');
    return { catalogId: exercise.catalogId, name: exercise.name, equipment: exercise.equipment, bodyweight: exercise.bodyweight,
      tracking: exercise.tracking, unit: exercise.unit, convention: exercise.convention, category: exercise.category, subcategory: exercise.subcategory, setCount: exercise.sets.length };
  });
}

export function addRoutineToDraft(draft: WorkoutDraft, routine: Routine, id: () => string): WorkoutDraft {
  if (!draft.locationId) throw new Error('Choose your gym or Home before adding a routine.');
  const exercises: ExerciseDraft[] = routine.exercises.map(({ setCount, ...exercise }) => ({
    ...exercise, id: id(), equipment: draft.locationId === routine.locationId ? exercise.equipment : '',
    sets: Array.from({ length: setCount }, () => ({ id: id(), weight: '', reps: '', completed: false })),
  }));
  return { ...draft, sessionType: draft.exercises.length ? draft.sessionType : routine.sessionType, exercises: [...draft.exercises, ...exercises] };
}
