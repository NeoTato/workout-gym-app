import { createContext, useContext } from 'react';
import type { RestState } from '../../domain/restTimer';

export type RestContextValue = {
  alarmEnabled: boolean; setAlarmEnabled: (value: boolean) => void;
  state: RestState | null; busy: boolean; error: string; visible: boolean; label: string; remindersAvailable: boolean;
  open: (label?: string) => void; close: () => void; reload: () => void;
  start: (seconds: number) => Promise<boolean>; autoStart: (label: string) => void;
  quickStart: (label: string) => void;
  change: (action: 'pause' | 'resume' | 'extend' | 'end' | 'restart') => void;
  preference: (key: 'autoStart' | 'reminders', value: boolean) => void;
};
export const RestContext = createContext<RestContextValue | null>(null);
export function useRestTimer(): RestContextValue {
  const context = useContext(RestContext);
  if (!context) throw new Error('Rest timer provider is missing.');
  return context;
}
