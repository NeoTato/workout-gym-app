import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import type { RestTimer } from '../../domain/restTimer';

// Only countdown UI ticks. Logging fields do not rerender every second.
export function useRestClock(timer: RestTimer | null) {
  const [now, setNow] = useState(Date.now);
  const [active, setActive] = useState(AppState.currentState !== 'background');
  useEffect(() => {
    const subscription = AppState.addEventListener('change', status => { setActive(status === 'active'); if (status === 'active') setNow(Date.now()); });
    return () => subscription.remove();
  }, []);
  useEffect(() => {
    const refresh = setTimeout(() => setNow(Date.now()), 0);
    const deadline = timer?.endsAt;
    const interval = active && deadline != null && deadline > Date.now()
      ? setInterval(() => { const time = Date.now(); setNow(time); if (time >= deadline && interval) clearInterval(interval); }, 500) : null;
    return () => { clearTimeout(refresh); if (interval) clearInterval(interval); };
  }, [timer, active]);
  return now;
}
