export const exerciseCategories = ['Push', 'Pull', 'Legs', 'Core', 'Cardio', 'Mobility', 'Other'] as const;
export type ExerciseCategory = typeof exerciseCategories[number] | '';
export type ExerciseSubcategory = 'Chest' | 'Triceps' | 'Shoulders' | 'Back' | 'Biceps' | '';
export function subcategoriesFor(category: ExerciseCategory): readonly ExerciseSubcategory[] {
  if (category === 'Push') return ['Chest', 'Triceps', 'Shoulders'];
  if (category === 'Pull') return ['Back', 'Biceps'];
  return [];
}
export type LoggedExercise = { id: string; name: string; bodyweight: boolean; tracking?: 'duration' | 'distance_duration'; category?: ExerciseCategory; subcategory?: ExerciseSubcategory };

export function cleanExerciseName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

export function exerciseNameKey(name: string): string {
  return cleanExerciseName(name).toLowerCase();
}

export function matchingExercises(items: LoggedExercise[], query: string, category: ExerciseCategory | 'All' = 'All', subcategory: ExerciseSubcategory | 'All' = 'All'): LoggedExercise[] {
  const key = exerciseNameKey(query);
  return items.filter(item => exerciseNameKey(item.name).includes(key)
    && (category === 'All' || (item.category ?? '') === category)
    && (subcategory === 'All' || (item.subcategory ?? '') === subcategory));
}
