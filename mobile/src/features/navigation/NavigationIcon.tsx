import Svg, { Circle, Path, Rect } from 'react-native-svg';
export function NavigationIcon({ name, color, size = 24 }: { name: 'home' | 'history' | 'progress' | 'settings' | 'plus'; color: string; size?: number }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {name === 'home' && <Path d="m3 10 9-7 9 7v10H3Z M9 20v-7h6v7" />}
    {name === 'history' && <><Rect x={3} y={5} width={18} height={16} rx={3} /><Path d="M7 3v4m10-4v4M3 11h18m-12 4h2m3 0h2m-7 3h2" /></>}
    {name === 'progress' && <Path d="M4 3v17h17M7 15l4-5 4 2 6-7" />}
    {name === 'settings' && <><Path d="m9 3-1 3-3 1-2 4 2 3v4l4 3 3-1 4 1 3-4-1-3 2-4-3-3-3-1-1-3Z" /><Circle cx={12} cy={12} r={3} /></>}
    {name === 'plus' && <Path d="M12 5v14M5 12h14" />}
  </Svg>;
}
