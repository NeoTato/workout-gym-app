import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { getTheme } from '../../../ui/theme';
import { GoalDialog } from '../GoalDialog';

it('requires an explicit changed target and retains the dialog after a failed save', async () => {
  const save = jest.fn().mockRejectedValueOnce(new Error('disk')).mockResolvedValue(undefined), close = jest.fn();
  await render(<GoalDialog theme={getTheme('light')} initial={3} currentTarget={3} nextWeekLabel="next Monday" save={save} close={close} />);
  expect(screen.getByRole('button', { name: 'Save target' })).toBeDisabled();
  await fireEvent.press(screen.getByRole('button', { name: 'Active days per week: 4' }));
  expect(save).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: 'Save target' }));
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Unable to save your target. Try again.'));
  expect(close).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: 'Save target' }));
  await waitFor(() => expect(close).toHaveBeenCalledTimes(1));
  expect(save).toHaveBeenLastCalledWith(4);
});

it('lets a scheduled change be cancelled by selecting the current goal', async () => {
  const save = jest.fn().mockResolvedValue(undefined);
  await render(<GoalDialog theme={getTheme('dark')} initial={4} currentTarget={3} nextWeekLabel="next Monday" save={save} close={jest.fn()} />);
  await fireEvent.press(screen.getByRole('button', { name: 'Active days per week: 3' }));
  expect(screen.getByText('This cancels your scheduled change.')).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'Save target' }));
  await waitFor(() => expect(save).toHaveBeenCalledWith(3));
});
