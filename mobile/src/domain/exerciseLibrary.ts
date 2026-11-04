export const exerciseCategories = ['Push', 'Pull', 'Legs', 'Core', 'Cardio', 'Mobility', 'Other'] as const;
export type ExerciseCategory = typeof exerciseCategories[number] | '';
export type LoggedExercise = { id: string; name: string; bodyweight: boolean; category?: ExerciseCategory };

export function cleanExerciseName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

export function exerciseNameKey(name: string): string {
  return cleanExerciseName(name).toLowerCase();
}

export function matchingExercises(items: LoggedExercise[], query: string, category: ExerciseCategory | 'All' = 'All'): LoggedExercise[] {
  const key = exerciseNameKey(query);
  return items.filter(item => exerciseNameKey(item.name).includes(key) && (category === 'All' || (item.category ?? '') === category));
}
