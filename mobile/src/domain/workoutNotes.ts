import { exerciseNameKey, type LoggedExercise } from './exerciseLibrary';
import { canCompleteSet, type ExerciseDraft, type LoadUnit } from './workout';

export type NotesExercise = { line: number; source: string; name: string; bodyweight: boolean; unit: LoadUnit; sets: { weight: string; reps: string }[]; inferredUnit: boolean };
export type NotesIssue = { line: number; source: string; reason: string };
export type NotesResult = { exercises: NotesExercise[]; issues: NotesIssue[] };
export const NOTES_LIMIT = 20000;

export function parseWorkoutNotes(text: string): NotesResult {
  if (text.length > NOTES_LIMIT) throw new Error('Paste up to 20,000 characters at a time.');
  const lines = text.split(/\r?\n/).map((source, index) => ({ source: source.trim(), line: index + 1 })).filter(row => row.source);
  if (!lines.length) throw new Error('Paste at least one exercise with its sets.');
  if (lines.length > 100) throw new Error('Import up to 100 nonblank lines at a time.');
  const result: NotesResult = { exercises: [], issues: [] };
  for (const row of lines) {
    try { result.exercises.push(parseLine(row.source, row.line)); }
    catch (error) { result.issues.push({ ...row, reason: error instanceof Error ? error.message : 'Check this line.' }); }
  }
  return result;
}

function parseLine(source: string, line: number): NotesExercise {
  const text = source.replace(/\\+$/, '').replace(/^[-•]\s+/, '').trim();
  const start = text.search(/\d/);
  if (start < 1) throw new Error('Use an exercise name followed by sets, such as 70lbs x13 or 5reps.');
  const name = text.slice(0, start).trim().replace(/:$/, '').trim();
  if (!name || name.length > 160 || /[\d+\-.,]$/.test(name) || /\d/.test(name)) throw new Error('Check the exercise name and numbers. Numbered names and negative loads need manual entry.');
  let remaining = text.slice(start), unit: LoadUnit | undefined, bodyweight: boolean | undefined, inferredUnit = false;
  const sets: NotesExercise['sets'] = [];
  while (remaining) {
    const weighted = remaining.match(/^(\d+(?:\.\d+)?)\s*(lbs?|kgs?|plates?)?\s*[x×]\s*(\d+)(?:\s*reps?\b)?/i);
    const repsOnly = remaining.match(/^(\d+)\s*reps?\b/i);
    if (weighted) {
      if (bodyweight === true) throw new Error('Put weighted and bodyweight sets on separate lines.');
      bodyweight = false;
      const explicit = weighted[2]?.toLowerCase();
      const nextUnit: LoadUnit | undefined = explicit ? explicit.startsWith('lb') ? 'lb' : explicit.startsWith('kg') ? 'kg' : 'plates' : unit;
      if (!nextUnit) throw new Error('Add lb, kg or plates to the first weighted set on this line.');
      if (unit && unit !== nextUnit) throw new Error('Mixed units: split this exercise into one line per unit.');
      if (!explicit) inferredUnit = true;
      unit = nextUnit;
      sets.push({ weight: weighted[1], reps: weighted[3] });
      remaining = remaining.slice(weighted[0].length);
    } else if (repsOnly) {
      if (bodyweight === false) throw new Error('Put weighted and bodyweight sets on separate lines.');
      bodyweight = true; sets.push({ weight: '', reps: repsOnly[1] }); remaining = remaining.slice(repsOnly[0].length);
    } else throw new Error('Some text or measurements could not be read. Edit this line; nothing from it will be imported.');
    if (!Number.isSafeInteger(Number(sets.at(-1)!.reps)) || !canCompleteSet(sets.at(-1)!, bodyweight)) throw new Error('Use nonnegative loads and positive whole reps.');
    if (sets.length > 50) throw new Error('Use up to 50 sets per exercise.');
    if (remaining && !/^[\s,;|]/.test(remaining)) throw new Error('Separate sets with spaces or commas and check the numbers.');
    remaining = remaining.replace(/^[\s,;|]+/, '');
  }
  return { line, source, name, unit: unit ?? 'lb', bodyweight: Boolean(bodyweight), sets, inferredUnit };
}

export function compatibleNoteMatches(note: NotesExercise, library: LoggedExercise[]): LoggedExercise[] {
  const key = exerciseNameKey(note.name);
  return library.filter(item => !item.tracking && item.bodyweight === note.bodyweight && (exerciseNameKey(item.name).includes(key) || key.includes(exerciseNameKey(item.name)))).slice(0, 5);
}

export function noteToExercise(note: NotesExercise, newId: () => string, match?: LoggedExercise): ExerciseDraft {
  if (match && (match.tracking || match.bodyweight !== note.bodyweight)) throw new Error('Choose a saved exercise with matching tracking.');
  return { id: newId(), name: match?.name ?? note.name, ...(match ? { catalogId: match.id, category: match.category, subcategory: match.subcategory } : {}),
    equipment: '', unit: note.unit, bodyweight: note.bodyweight, convention: 'total', sets: note.sets.map(set => ({ id: newId(), ...set, completed: true })) };
}
