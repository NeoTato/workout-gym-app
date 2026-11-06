import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Appearance, Platform } from 'react-native';
import type { AppearancePreference } from '../domain/appearance';
import { openStore } from '../storage/openStore';
import { AppearanceContext } from './appearanceContext';

export function AppearanceProvider({ children, store = openStore }: { children: ReactNode; store?: typeof openStore }) {
  const [preference, setPreference] = useState<AppearancePreference>('system');
  const [ready, setReady] = useState(false), [saving, setSaving] = useState(false), [error, setError] = useState('');
  const locked = useRef(false), alive = useRef(true);
  const reload = useCallback(() => Promise.resolve().then(store).then(db => db.getAppearance()).then(value => {
    if (alive.current) { setPreference(value); setError(''); }
  }).catch(() => { if (alive.current) setError('Unable to load appearance. Try again.'); })
    .finally(() => { if (alive.current) setReady(true); }), [store]);
  useEffect(() => { alive.current = true; void reload(); return () => { alive.current = false; }; }, [reload]);
  useEffect(() => { if (Platform.OS !== 'web') Appearance.setColorScheme(preference === 'system' ? 'auto' : preference); }, [preference]);
  const change = async (value: AppearancePreference) => {
    if (locked.current) return;
    locked.current = true; setSaving(true); setError('');
    try { await (await store()).setAppearance(value); if (alive.current) setPreference(value); }
    catch { if (alive.current) setError('Unable to save appearance. Your previous choice is still active. Try again.'); }
    finally { locked.current = false; if (alive.current) setSaving(false); }
  };
  return <AppearanceContext value={{ preference, ready, saving, error, change, reload }}>{children}</AppearanceContext>;
}
