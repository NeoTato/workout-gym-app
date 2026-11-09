export const MAX_REST_SECONDS = 3600;
export type RestTimer = { id: string; label: string; endsAt: number | null; remainingMs: number };
export type RestState = { workoutId: string; epoch: number; seconds: number; autoStart: boolean; reminders: boolean; timer: RestTimer | null };
export const newRestState = (workoutId: string, epoch = 0): RestState => ({ workoutId, epoch, seconds: 90, autoStart: false, reminders: false, timer: null });

export function restRemaining(timer: RestTimer | null, now: number): number {
  return timer ? Math.max(0, Math.min(MAX_REST_SECONDS * 1000, timer.endsAt === null ? timer.remainingMs : timer.endsAt - now)) : 0;
}
export function startRest(state: RestState, label: string, now: number, id: string): RestState {
  return validateRestState({ ...state, timer: { id, label: label.slice(0, 240), endsAt: now + state.seconds * 1000, remainingMs: state.seconds * 1000 } });
}
export function pauseRest(state: RestState, now: number): RestState {
  if (!state.timer || state.timer.endsAt === null || !restRemaining(state.timer, now)) return state;
  return { ...state, timer: { ...state.timer, endsAt: null, remainingMs: restRemaining(state.timer, now) } };
}
export function resumeRest(state: RestState, now: number): RestState {
  if (!state.timer || state.timer.endsAt !== null) return state;
  return { ...state, timer: { ...state.timer, endsAt: now + state.timer.remainingMs } };
}
export function extendRest(state: RestState, now: number): RestState {
  if (!state.timer) return state;
  const remainingMs = Math.min(MAX_REST_SECONDS * 1000, restRemaining(state.timer, now) + 30000);
  return { ...state, timer: { ...state.timer, remainingMs, endsAt: state.timer.endsAt === null ? null : now + remainingMs } };
}
export function customRestSeconds(minutes: string, seconds: string): number {
  if (![minutes, seconds].every(value => value === '' || /^\d+$/.test(value))) throw new Error('Use whole minutes and seconds.');
  const total = Number(minutes) * 60 + Number(seconds);
  if (!Number.isSafeInteger(total) || Number(seconds) > 59 || total < 1 || total > MAX_REST_SECONDS) throw new Error('Choose 1 second to 60 minutes; seconds must be 0–59.');
  return total;
}
export function restClock(milliseconds: number): string {
  const seconds = Math.ceil(milliseconds / 1000);
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

export function validateRestState(input: unknown): RestState {
  const fail = (): never => { throw new Error('Unable to read the saved rest timer.'); };
  const object = (value: unknown, fields: string[]): Record<string, unknown> => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return fail();
    const row = value as Record<string, unknown>;
    if (Object.keys(row).length !== fields.length || fields.some(field => !Object.hasOwn(row, field))) return fail();
    return row;
  };
  const identity = (value: unknown) => typeof value === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(value);
  const state = object(input, ['workoutId', 'epoch', 'seconds', 'autoStart', 'reminders', 'timer']);
  if (!identity(state.workoutId) || !Number.isSafeInteger(state.epoch) || Number(state.epoch) < 0 || !Number.isSafeInteger(state.seconds) || Number(state.seconds) < 1 || Number(state.seconds) > MAX_REST_SECONDS || typeof state.autoStart !== 'boolean' || typeof state.reminders !== 'boolean') return fail();
  if (state.timer !== null) {
    const timer = object(state.timer, ['id', 'label', 'endsAt', 'remainingMs']);
    if (!identity(timer.id) || typeof timer.label !== 'string' || timer.label.length > 240
      || !Number.isSafeInteger(timer.remainingMs) || Number(timer.remainingMs) < 1 || Number(timer.remainingMs) > MAX_REST_SECONDS * 1000
      || timer.endsAt !== null && (!Number.isSafeInteger(timer.endsAt) || Number(timer.endsAt) < 0)) return fail();
  }
  return input as RestState;
}
