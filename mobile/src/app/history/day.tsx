import { router, useLocalSearchParams } from 'expo-router';
import { useColorScheme } from 'react-native';
import type { LocationFilter } from '../../domain/workoutCalendar';
import { DayDetailsScreen } from '../../features/history/DayDetailsScreen';
import { useDayWorkouts } from '../../features/history/useDayWorkouts';
import { getTheme } from '../../ui/theme';

export default function WorkoutDayRoute() {
  const { date = '', filter = 'all' } = useLocalSearchParams<{ date: string; filter?: LocationFilter }>();
  const query = useDayWorkouts(date, filter);
  return <DayDetailsScreen date={date} filter={filter} {...query} theme={getTheme(useColorScheme())}
    back={() => { if (router.canGoBack()) router.back(); else router.replace('/'); }}
    open={id => router.push({ pathname: '/history/[id]', params: { id, returnToDay: '1' } })} />;
}
