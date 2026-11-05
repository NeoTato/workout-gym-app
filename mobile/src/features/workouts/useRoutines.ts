import { useEffect, useState } from 'react';
import type { Routine } from '../../domain/routine';
import { openStore } from '../../storage/openStore';

export function useRoutines() {
  const [items, setItems] = useState<Routine[]>([]);
  const [loading, setLoading] = useState(true), [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    openStore().then(store => store.listRoutines()).then(value => { if (active) { setItems(value); setLoading(false); } })
      .catch(() => { if (active) { setError('Unable to load routines. Try again.'); setLoading(false); } });
    return () => { active = false; };
  }, [revision]);
  return { items, loading, error, reload: () => { setLoading(true); setError(''); setRevision(value => value + 1); } };
}
