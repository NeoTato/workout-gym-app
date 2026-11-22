import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Keyboard } from 'react-native';
import { usePathname } from 'expo-router';

export function navigationTab(path: string): 'home' | 'history' | 'progress' | 'settings' | null {
  if (path === '/' || path === '/consistency') return 'home';
  if (path === '/history' || path.startsWith('/history/')) return 'history';
  if (path === '/progress' || path.startsWith('/progress/') || path === '/summary') return 'progress';
  if (path === '/settings') return 'settings';
  return null;
}
const NavigationContext = createContext<{ visible: boolean; hide: () => () => void } | null>(null);
export function NavigationProvider({ children }: { children: ReactNode }) {
  const path = usePathname();
  const [hidden, setHidden] = useState(0), [keyboard, setKeyboard] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboard(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboard(false));
    return () => { show.remove(); hide.remove(); };
  }, []);
  const hide = useCallback(() => { setHidden(value => value + 1); return () => setHidden(value => Math.max(0, value - 1)); }, []);
  const visible = Boolean(navigationTab(path)) && hidden === 0 && !keyboard;
  const value = useMemo(() => ({ visible, hide }), [visible, hide]);
  return <NavigationContext value={value}>{children}</NavigationContext>;
}
export const useBottomNavigationVisible = () => useContext(NavigationContext)?.visible ?? false;
export function useHideBottomNavigation() {
  const hide = useContext(NavigationContext)?.hide;
  useEffect(() => hide?.(), [hide]);
}
