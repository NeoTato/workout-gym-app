export type LoggedExercise = { id: string; name: string; bodyweight: boolean };

export function cleanExerciseName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

export function exerciseNameKey(name: string): string {
  return cleanExerciseName(name).toLowerCase();
}

export function matchingExercises(items: LoggedExercise[], query: string): LoggedExercise[] {
  const key = exerciseNameKey(query);
  return items.filter(item => exerciseNameKey(item.name).includes(key));
}
