import { fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';
import { Platform } from 'react-native';
import type { WorkoutDraft } from '../../../domain/workout';
import { getTheme } from '../../../ui/theme';
import { WorkoutTimeEditor } from '../WorkoutTimeEditor';

jest.mock('@react-native-community/datetimepicker', () => {
  const { View } = jest.requireActual('react-native');
  return { __esModule: true, default: (props: object) => <View {...props} testID="system-picker" /> };
});

const initial: WorkoutDraft = { id: 'session', startedAt: '2026-11-01T01:00:00Z', endedAt: '2026-11-01T02:00:00Z',
  activityDate: '2026-11-01', timezone: 'Asia/Manila', locationId: 'home', sessionType: 'Push', exercises: [] };
function Editor() {
  const [draft, setDraft] = useState(initial);
  return <WorkoutTimeEditor draft={draft} theme={getTheme('light')} disabled={false}
    update={timing => setDraft(value => ({ ...value, timing }))} />;
}

it('shows recorded timezone times and moves a same-day end date when backdating', async () => {
  await render(<Editor />);
  expect(screen.getByRole('button', { name: 'Start time: 09:00' })).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'End time: 10:00' })).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'Start date: 2026-11-01' }));
  await fireEvent(screen.getByTestId('system-picker'), 'valueChange', {}, new Date('2026-10-31T09:00:00Z'));
  await fireEvent.press(screen.getByRole('button', { name: 'Done' }));
  expect(screen.getByRole('button', { name: 'End date: 2026-10-31' })).toBeOnTheScreen();
  expect(screen.queryByTestId('system-picker')).toBeNull();
});

it('cancels picker changes without modifying the workout or offering text inputs', async () => {
  await render(<Editor />);
  expect(screen.queryAllByRole('textbox')).toHaveLength(0);
  await fireEvent.press(screen.getByRole('button', { name: 'Start time: 09:00' }));
  await fireEvent(screen.getByTestId('system-picker'), 'valueChange', {}, new Date('2026-11-01T08:30:00Z'));
  await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
  expect(screen.getByRole('button', { name: 'Start time: 09:00' })).toBeOnTheScreen();
});

it('confirms clock selection without changing the selected date', async () => {
  await render(<Editor />);
  await fireEvent.press(screen.getByRole('button', { name: 'Start time: 09:00' }));
  expect(screen.getByTestId('system-picker').props.timeZoneName).toBe('UTC');
  await fireEvent(screen.getByTestId('system-picker'), 'valueChange', {}, new Date('2026-11-01T08:30:00Z'));
  await fireEvent.press(screen.getByRole('button', { name: 'Done' }));
  expect(screen.getByRole('button', { name: 'Start time: 08:30' })).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Start date: 2026-11-01' })).toBeOnTheScreen();
});

it('handles Android dismissal and confirmation separately', async () => {
  jest.replaceProperty(Platform, 'OS', 'android');
  try {
    await render(<Editor />);
    await fireEvent.press(screen.getByRole('button', { name: 'Start date: 2026-11-01' }));
    await fireEvent(screen.getByTestId('system-picker'), 'dismiss');
    expect(screen.getByRole('button', { name: 'Start date: 2026-11-01' })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Start date: 2026-11-01' }));
    await fireEvent(screen.getByTestId('system-picker'), 'valueChange', {}, new Date('2026-10-31T09:00:00Z'));
    expect(screen.getByRole('button', { name: 'Start date: 2026-10-31' })).toBeOnTheScreen();
    expect(screen.queryByTestId('system-picker')).toBeNull();
  } finally { jest.restoreAllMocks(); }
});
