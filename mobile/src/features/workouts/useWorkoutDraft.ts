import { randomUUID } from 'expo-crypto';
import { useEffect, useRef, useState } from 'react';
import { localDate, type Location, type WorkoutDraft, type ExerciseDraft } from '../../domain/workout';
import { openStore } from '../../storage/openStore';
import type { WorkoutStore } from '../../storage/workoutStore';

export function newExercise(): ExerciseDraft {
  return { id: randomUUID(), name: '', equipment: '', bodyweight: false, unit: 'lb', convention: 'total', sets: [{ id: randomUUID(), weight: '', reps: '', completed: false }] };
}
export function useWorkoutDraft() {
  const [draft, setDraft] = useState<WorkoutDraft | null>(null);
  const current = useRef<WorkoutDraft | null>(null);
  const store = useRef<WorkoutStore | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [status, setStatus] = useState('Loading your workout…');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false), revision = useRef(0), alive = useRef(true);
  useEffect(() => {
    let active = true;
    alive.current = true;
    (async () => {
      const db = await openStore(); store.current = db;
      let saved = await db.getDraft();
      if (!saved) {
        const date = new Date();
        saved = { id: randomUUID(), startedAt: date.toISOString(), activityDate: localDate(date), timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, locationId: '', sessionType: 'Custom', exercises: [newExercise()] };
        saved = await db.beginDraft(saved);
      }
      const choices = await db.listLocations();
      if (active) { current.current = saved; setDraft(saved); setLocations(choices); setStatus('Saved on this phone'); }
    })().catch(() => { if (active) { setError('Unable to open your workout. Return Home and try again. Your data has not been reset.'); setStatus('Unable to load'); } });
    return () => { active = false; alive.current = false; };
  }, []);
  function update(change: (value: WorkoutDraft) => WorkoutDraft) {
    if (!current.current || !store.current || busyRef.current) return;
    const next = change(current.current), version = ++revision.current;
    current.current = next; setDraft(next); setStatus('Saving…'); setError('');
    store.current.saveDraft(next).then(() => {
      if (alive.current && version === revision.current) setStatus('Saved on this phone');
    }).catch(() => { if (alive.current && version === revision.current) { setStatus('Not saved'); setError('Unable to save this edit. Keep the app open and tap Retry save.'); } });
  }
  async function addGym(name: string) {
    if (!store.current || busyRef.current) return;
    const gym = await store.current.addGym(name);
    setLocations(await store.current.listLocations()); update(value => ({ ...value, locationId: gym.id }));
  }
  async function finish() {
    if (!store.current || !current.current || busyRef.current) return;
    busyRef.current = true; setBusy(true); setError('');
    try { return await store.current.finish(current.current); }
    catch (failure) { setError(failure instanceof Error && /choose|enter|name|mark/i.test(failure.message) ? failure.message : 'Unable to finish. Your draft is still here. Try again.'); }
    finally { busyRef.current = false; if (alive.current) setBusy(false); }
  }
  async function discard() {
    if (!store.current || !current.current || busyRef.current) return false;
    busyRef.current = true; setBusy(true);
    try { await store.current.discardDraft(current.current.id); return true; }
    catch { setError('Unable to discard. Your draft is still here.'); return false; }
    finally { busyRef.current = false; if (alive.current) setBusy(false); }
  }
  return { draft, locations, status, error, busy, update, addGym, finish, discard };
}
