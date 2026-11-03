import { fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';
import type { WorkoutDraft } from '../../../domain/workout';
import { getTheme } from '../../../ui/theme';
import { WorkoutTimeEditor } from '../WorkoutTimeEditor';

const initial: WorkoutDraft = { id: 'session', startedAt: '2026-11-01T01:00:00Z', endedAt: '2026-11-01T02:00:00Z',
  activityDate: '2026-11-01', timezone: 'Asia/Manila', locationId: 'home', sessionType: 'Push', exercises: [] };
function Editor() {
  const [draft, setDraft] = useState(initial);
  return <WorkoutTimeEditor draft={draft} theme={getTheme('light')} disabled={false}
    update={timing => setDraft(value => ({ ...value, timing }))} />;
}

it('shows recorded timezone times and moves a same-day end date when backdating', async () => {
  await render(<Editor />);
  expect(screen.getByLabelText('Start time')).toHaveDisplayValue('09:00');
  expect(screen.getByLabelText('End time')).toHaveDisplayValue('10:00');
  await fireEvent.changeText(screen.getByLabelText('Start date'), '2026-10-31');
  expect(screen.getByLabelText('End date')).toHaveDisplayValue('2026-10-31');
  await fireEvent.changeText(screen.getByLabelText('End date'), '2026-11-01');
  await fireEvent.changeText(screen.getByLabelText('Start date'), '2026-10-30');
  expect(screen.getByLabelText('End date')).toHaveDisplayValue('2026-11-01');
});
