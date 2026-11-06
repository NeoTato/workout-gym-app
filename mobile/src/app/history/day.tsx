import { router, useLocalSearchParams } from 'expo-router';
import type { LocationFilter } from '../../domain/workoutCalendar';
import { DayDetailsScreen } from '../../features/history/DayDetailsScreen';
import { useDayWorkouts } from '../../features/history/useDayWorkouts';
import { useAppTheme } from '../../ui/appearanceContext';

export default function WorkoutDayRoute() {
  const { date = '', filter = 'all' } = useLocalSearchParams<{ date: string; filter?: LocationFilter }>();
  const query = useDayWorkouts(date, filter);
  return <DayDetailsScreen date={date} filter={filter} {...query} theme={useAppTheme()}
    back={() => { if (router.canGoBack()) router.back(); else router.replace('/'); }}
    open={id => router.push({ pathname: '/history/[id]', params: { id, returnToDay: '1' } })} />;
}
