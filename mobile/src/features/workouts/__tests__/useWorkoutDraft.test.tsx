import { act, renderHook, waitFor } from '@testing-library/react-native';
import { openStore } from '../../../storage/openStore';
import type { WorkoutStore } from '../../../storage/workoutStore';
import { useWorkoutDraft } from '../useWorkoutDraft';

jest.mock('expo-crypto', () => ({ randomUUID: () => 'id' }));
jest.mock('../../../storage/openStore', () => ({ openStore: jest.fn() }));

it('stays quiet on load, briefly confirms edits, and keeps failed saves visible until retry succeeds', async () => {
  const saveDraft = jest.fn().mockResolvedValue(undefined);
  const store: Pick<WorkoutStore, 'getDraft' | 'listLocations' | 'saveDraft'> = {
    getDraft: jest.fn().mockResolvedValue({ id: 'draft', locationId: 'home', sessionType: 'Push', exercises: [] }),
    listLocations: jest.fn().mockResolvedValue([]), saveDraft,
  };
  jest.mocked(openStore).mockResolvedValue(store as WorkoutStore);
  const { result, unmount } = await renderHook(useWorkoutDraft);
  await waitFor(() => expect(result.current.draft).not.toBeNull());
  expect(result.current.status).toBe('');
  jest.useFakeTimers();
  try {
    await act(async () => { result.current.update(value => ({ ...value, sessionType: 'Pull' })); });
    expect(result.current.status).toBe('Draft saved');
    await act(async () => { jest.advanceTimersByTime(2500); });
    expect(result.current.status).toBe('');
    saveDraft.mockRejectedValueOnce(new Error('Storage unavailable'));
    await act(async () => { result.current.update(value => ({ ...value, sessionType: 'Legs' })); });
    expect(result.current.status).toBe('Not saved');
    await act(async () => { jest.advanceTimersByTime(10000); });
    expect(result.current.status).toBe('Not saved');
    expect(result.current.error).toMatch(/Retry save/);
    await act(async () => { result.current.update(value => ({ ...value })); });
    expect(result.current.status).toBe('Draft saved');
    expect(result.current.error).toBe('');
    await unmount();
  } finally { jest.useRealTimers(); }
});
