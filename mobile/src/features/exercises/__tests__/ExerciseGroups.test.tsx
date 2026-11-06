import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { ExerciseGroups } from '../ExerciseGroups';
import { getTheme } from '../../../ui/theme';
import type { LoggedExercise } from '../../../domain/exerciseLibrary';

const items: LoggedExercise[] = [
  { id: 'press', name: 'Bench press', bodyweight: false, category: 'Push', subcategory: 'Chest' },
  { id: 'fly', name: 'Fly', bodyweight: false, category: 'Push', subcategory: 'Chest' },
  { id: 'extension', name: 'Extension', bodyweight: false, category: 'Push', subcategory: 'Triceps' },
  { id: 'old', name: 'Older exercise', bodyweight: false },
];
const renderItem = (item: LoggedExercise) => <Text>{item.name}</Text>;

it('starts collapsed, counts exercises and opens subcategories independently without losing uncategorized items', async () => {
  await render(<ExerciseGroups items={items} theme={getTheme('light')} renderItem={renderItem} />);
  expect(screen.queryByText('Bench press')).toBeNull();
  expect(screen.getByRole('button', { name: 'Push / Chest, 2 exercises', expanded: false })).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'Push / Chest, 2 exercises' }));
  expect(screen.getByText('Bench press')).toBeOnTheScreen(); expect(screen.getByText('Fly')).toBeOnTheScreen();
  expect(screen.queryByText('Extension')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Uncategorized, 1 exercise' }));
  expect(screen.getByText('Older exercise')).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'Push / Chest, 2 exercises' }));
  expect(screen.queryByText('Bench press')).toBeNull(); expect(screen.getByText('Older exercise')).toBeOnTheScreen();
});

it('shows search matches directly and restores group expansion after clearing search', async () => {
  const view = await render(<ExerciseGroups items={items} theme={getTheme('dark')} renderItem={renderItem} />);
  await fireEvent.press(screen.getByRole('button', { name: 'Push / Chest, 2 exercises' }));
  await view.rerender(<ExerciseGroups items={[items[2]]} searching theme={getTheme('dark')} renderItem={renderItem} />);
  expect(screen.getByText('Extension')).toBeOnTheScreen(); expect(screen.queryByRole('button')).toBeNull();
  await view.rerender(<ExerciseGroups items={items} theme={getTheme('dark')} renderItem={renderItem} />);
  expect(screen.getByText('Bench press')).toBeOnTheScreen(); expect(screen.queryByText('Extension')).toBeNull();
});
