import { randomUUID } from 'expo-crypto';
import { usePathname } from 'expo-router';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState, Keyboard } from 'react-native';
import { newRestState, startRest, pauseRest, resumeRest, extendRest, type RestState } from '../../domain/restTimer';
import { openStore } from '../../storage/openStore';
import { RestContext } from './restContext';
import { restNotifications } from './restNotifications';
import type { AlarmSound } from './alarmSounds';

export function RestTimerProvider({ children }: { children: ReactNode }) {
  const [alarmEnabled, setAlarmEnabled] = useState(true);
  const [alarmSound, setAlarmSound] = useState<AlarmSound>('beep');
  const [state, setState] = useState<RestState | null>(null), current = useRef<RestState | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [visible, setVisible] = useState(false), [label, setLabel] = useState('Between exercises');
  const alive = useRef(true), tail = useRef<Promise<unknown>>(Promise.resolve());
  const pathname = usePathname();
  const assign = useCallback((value: RestState | null) => { current.current = value; if (alive.current) setState(value); }, []);
  const run = useCallback((work: () => Promise<boolean>) => {
    const result = tail.current.catch(() => undefined).then(async () => {
      if (!alive.current) return false;
      setBusy(true); setError('');
      try { return await work(); }
      catch { if (alive.current) setError('Unable to save the rest timer. Try again; your workout is still here.'); return false; }
      finally { if (alive.current) setBusy(false); }
    }); tail.current = result; return result;
  }, []);
  const sync = useCallback(async (value: RestState | null) => {
    try { await restNotifications.sync(value); }
    catch { if (alive.current) setError('Rest reminder unavailable. The countdown still works; check notification permissions or retry.'); }
  }, []);
  const reload = useCallback(() => { void run(async () => {
    const value = await (await openStore()).getRestTimer(); assign(value); if (!value) setVisible(false); await sync(value); return true;
  }); }, [run, assign, sync]);
  useEffect(() => {
    alive.current = true;
    const subscription = AppState.addEventListener('change', status => { if (status === 'active') reload(); });
    return () => { alive.current = false; subscription.remove(); };
  }, [reload]);
  useEffect(reload, [pathname, reload]);
  const save = async (value: RestState) => {
    if (!await (await openStore()).saveRestTimer(value)) { assign(null); await sync(null); return false; }
    assign(value); await sync(value); return true;
  };
  const open = (nextLabel = current.current?.timer?.label ?? 'Between exercises') => { Keyboard.dismiss(); void run(async () => {
    const db = await openStore(), draft = await db.getDraft();
    if (!draft) { assign(null); setVisible(false); await sync(null); return false; }
    const saved = await db.getRestTimer(), value = saved ?? newRestState(draft.id, await db.getRestTimerEpoch());
    if (!saved && !await db.saveRestTimer(value)) { assign(null); await sync(null); return false; }
    assign(value); setLabel(nextLabel); setVisible(true); return true;
  }); };
  return <RestContext value={{ alarmSound, setAlarmSound, alarmEnabled, setAlarmEnabled, state, busy, error, visible, label, remindersAvailable: restNotifications.available,
    open, close: () => { if (!busy) setVisible(false); }, reload,
    start: seconds => run(async () => {
      if (!current.current) return false;
      const success = await save(startRest({ ...current.current, seconds }, label, Date.now(), randomUUID()));
      if (success) setVisible(false); return success;
    }),
    autoStart: nextLabel => { void run(async () => {
      if (!current.current?.autoStart) return true;
      return save(startRest(current.current, nextLabel, Date.now(), randomUUID()));
    }); },
    quickStart: nextLabel => { Keyboard.dismiss(); void run(async () => {
      const db = await openStore(), draft = await db.getDraft(); if (!draft) { assign(null); await sync(null); return false; }
      const value = await db.getRestTimer() ?? newRestState(draft.id, await db.getRestTimerEpoch());
      return save(startRest(value, nextLabel, Date.now(), randomUUID()));
    }); },
    change: action => { void run(async () => {
      const value = current.current; if (!value?.timer) return false;
      const time = Date.now();
      return save(action === 'end' ? { ...value, timer: null } : action === 'pause' ? pauseRest(value, time) : action === 'resume' ? resumeRest(value, time)
        : action === 'extend' ? extendRest(value, time) : startRest(value, value.timer.label, time, randomUUID()));
    }); },
    preference: (key, value) => { void run(async () => {
      if (!current.current) return false;
      if (key === 'reminders' && value && !await restNotifications.enable()) { setError('Notifications are off or unavailable. You can still use the countdown.'); return false; }
      return save({ ...current.current, [key]: value });
    }); },
  }}>{children}</RestContext>;
}
