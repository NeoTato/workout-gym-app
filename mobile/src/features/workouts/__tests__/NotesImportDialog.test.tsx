import { fireEvent, render, screen } from '@testing-library/react-native';
import { NotesImportDialog } from '../NotesImportDialog';
jest.mock('expo-crypto', () => { let id = 0; return { randomUUID: () => `note-${++id}` }; });

test('requires explicit review and exclusion; choosing saved identity preserves parsed units and sets', async () => {
  const imported = jest.fn();
  await render(<NotesImportDialog busy={false} close={jest.fn()} importExercises={imported} library={[{ id: 'saved', name: 'Preacher curl', bodyweight: false, category: 'Pull', subcategory: 'Biceps' }]} />);
  await fireEvent.changeText(screen.getByLabelText('Workout notes'), 'curl 12.5kgx4 10x8\nplank 45 seconds');
  await fireEvent.press(screen.getByRole('button', { name: 'Review detected workout' }));
  const add = () => screen.getByRole('button', { name: 'Add 1 exercise to draft' });
  expect(add()).toBeDisabled(); expect(screen.getByText(/Unit inferred: kg/)).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'Review line 1: curl' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Use Preacher curl' }));
  await fireEvent.press(screen.getByRole('checkbox', { name: 'I reviewed the detected sets and assumptions' }));
  expect(add()).toBeDisabled();
  await fireEvent.press(screen.getByRole('button', { name: 'Exclude line 2' }));
  expect(add()).toBeDisabled();
  await fireEvent.press(screen.getByRole('checkbox', { name: 'I reviewed the detected sets and assumptions' }));
  await fireEvent.press(add());
  expect(imported).toHaveBeenCalledTimes(1);
  expect(imported.mock.calls[0][0][0]).toMatchObject({ catalogId: 'saved', name: 'Preacher curl', category: 'Pull', subcategory: 'Biceps', unit: 'kg', equipment: '', sets: [{ weight: '12.5', reps: '4', completed: true }, { weight: '10', reps: '8', completed: true }] });
  await fireEvent.press(add()); expect(imported).toHaveBeenCalledTimes(1);
});
test('editing notes retains original text and resets review; unreadable text cannot import', async () => {
  await render(<NotesImportDialog busy={false} close={jest.fn()} importExercises={jest.fn()} library={[]} />);
  await fireEvent.changeText(screen.getByLabelText('Workout notes'), 'row 85x8');
  await fireEvent.changeText(screen.getByLabelText('Workout notes'), 'x'.repeat(20001));
  expect(screen.getByLabelText('Workout notes')).toHaveDisplayValue('row 85x8');
  await fireEvent.press(screen.getByRole('button', { name: 'Review detected workout' }));
  expect(screen.getByRole('button', { name: 'Add 0 exercises to draft' })).toBeDisabled();
  await fireEvent.press(screen.getByRole('button', { name: 'Edit pasted notes' }));
  expect(screen.getByLabelText('Workout notes')).toHaveDisplayValue('row 85x8');
  await fireEvent.changeText(screen.getByLabelText('Workout notes'), 'row 85lbsx8');
  await fireEvent.press(screen.getByRole('button', { name: 'Review detected workout' }));
  expect(screen.getByRole('button', { name: 'Add 1 exercise to draft' })).toBeDisabled();
});
