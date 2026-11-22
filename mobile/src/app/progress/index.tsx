import { router } from 'expo-router';
import { Text } from 'react-native';
import { HomeNavigationCard } from '../../features/home/HomeNavigationCard';
import { useAppTheme } from '../../ui/appearanceContext';
import { Screen, styles } from '../../ui/controls';

export default function ProgressRoute() {
  const theme = useAppTheme();
  return <Screen theme={theme}>
    <Text accessibilityRole="header" style={[styles.heading, { color: theme.text }]}>Progress</Text>
    <Text style={[styles.subtitle, { color: theme.muted }]}>Your exercises and the bigger picture.</Text>
    <HomeNavigationCard theme={theme} kind="progress" onPress={() => router.push('/progress/exercises')} />
    <HomeNavigationCard theme={theme} kind="summary" onPress={() => router.push('/summary')} />
  </Screen>;
}
