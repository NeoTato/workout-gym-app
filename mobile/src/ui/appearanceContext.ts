import { createContext, useContext } from 'react';
import { useColorScheme } from 'react-native';
import type { AppearancePreference } from '../domain/appearance';
import { getTheme } from './theme';

export type AppearanceState = {
  preference: AppearancePreference; ready: boolean; saving: boolean; error: string;
  change: (value: AppearancePreference) => Promise<void>; reload: () => Promise<void>;
};
export const AppearanceContext = createContext<AppearanceState | null>(null);
export function useAppTheme() {
  const state = useContext(AppearanceContext), system = useColorScheme();
  return getTheme(state?.preference && state.preference !== 'system' ? state.preference : system);
}
export function useAppearance() {
  const state = useContext(AppearanceContext), system = useColorScheme();
  if (!state) throw new Error('Appearance settings require AppearanceProvider.');
  const scheme = state.preference === 'system' ? system : state.preference;
  return { ...state, scheme, theme: getTheme(scheme) };
}
