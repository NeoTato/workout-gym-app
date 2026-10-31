import { useColorScheme } from 'react-native';

import { HomeScreen } from '../features/home/HomeScreen';
import { getTheme } from '../ui/theme';

export default function HomeRoute() {
  return <HomeScreen theme={getTheme(useColorScheme())} />;
}
