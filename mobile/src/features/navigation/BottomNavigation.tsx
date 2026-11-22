import { router, usePathname } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { openStore } from '../../storage/openStore';
import { useAppTheme } from '../../ui/appearanceContext';
import { fonts } from '../../ui/theme';
import { NavigationIcon } from './NavigationIcon';
import { navigationTab, useBottomNavigationVisible } from './navigationContext';

const destinations = [
  { key: 'home', label: 'Home', path: '/' }, { key: 'history', label: 'History', path: '/history' },
  { key: 'progress', label: 'Progress', path: '/progress' }, { key: 'settings', label: 'Settings', path: '/settings' },
] as const;
export function BottomNavigation() {
  const theme = useAppTheme(), insets = useSafeAreaInsets(), path = usePathname(), visible = useBottomNavigationVisible();
  const [width, setWidth] = useState(390), [hasDraft, setHasDraft] = useState(false);
  const launching = useRef(false);
  useEffect(() => {
    launching.current = false;
    let active = true;
    openStore().then(store => store.getDraft()).then(value => { if (active) setHasDraft(Boolean(value)); }).catch(() => { /* The workout route handles storage failures without inventing a new draft. */ });
    return () => { active = false; };
  }, [path]);
  if (!visible) return null;
  const height = 112 + insets.bottom, center = width / 2, edge = Math.sqrt(36 * 36 - 4 * 4);
  const outline = `M 0 56 Q 0 36 20 36 H ${center-edge} A 36 36 0 0 0 ${center+edge} 36 H ${width-20} Q ${width} 36 ${width} 56 V ${height} H 0 Z`;
  const tab = (item: typeof destinations[number]) => <Pressable key={item.key} accessibilityRole="tab" accessibilityLabel={item.label} accessibilityState={{ selected: navigationTab(path) === item.key }} onPress={() => { if (path !== item.path) router.replace(item.path); }}
    style={({ pressed }) => ({ flex: 1, minWidth: 44, minHeight: 76, alignItems: 'center', justifyContent: 'center', gap: 6, opacity: pressed ? 0.7 : 1 })}>
    <View style={{ borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4, alignItems: 'center', gap: 4, backgroundColor: navigationTab(path) === item.key ? theme.accentSoft : 'transparent' }}>
      <NavigationIcon name={item.key} color={navigationTab(path) === item.key ? theme.accent : theme.muted} />
      <Text style={{ color: navigationTab(path) === item.key ? theme.accent : theme.muted, fontFamily: fonts.medium, fontSize: 11 }}>{item.label}</Text>
    </View>
  </Pressable>;
  return <View style={{ backgroundColor: theme.background }}>
    <View testID="bottom-navigation" accessibilityLabel="Main navigation" onLayout={event => setWidth(event.nativeEvent.layout.width)} style={{ height, width: '100%', maxWidth: 640, alignSelf: 'center' }}>
      <Svg pointerEvents="none" width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{ position: 'absolute', top: 0 }} aria-hidden><Path d={outline} fill={theme.surface} /></Svg>
      <View style={{ flexDirection: 'row', position: 'absolute', top: 36, left: 0, right: 0, height: 76 }}>
        {destinations.slice(0,2).map(tab)}
        <View style={{ flex: 1, minWidth: 56, alignItems: 'center' }}>
          <Pressable testID="navigation-workout-action" accessibilityRole="button" accessibilityLabel={hasDraft ? 'Resume workout' : 'Start workout'} accessibilityHint="Open the current workout or set up a new one" onPress={() => { if (!launching.current) { launching.current = true; router.push('/workout'); } }}
            style={({ pressed }) => ({ position: 'absolute', top: -32, width: 56, height: 56, borderRadius: 28, backgroundColor: theme.primary, justifyContent: 'center', alignItems: 'center', opacity: pressed ? 0.8 : 1 })}>
            <NavigationIcon name="plus" color="#35201C" size={28} />
          </Pressable>
          <Text accessible={false} style={{ position: 'absolute', bottom: 14, color: theme.muted, fontFamily: fonts.medium, fontSize: 11 }}>Workout</Text>
        </View>
        {destinations.slice(2).map(tab)}
      </View>
    </View>
  </View>;
}
