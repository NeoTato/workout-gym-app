import * as Notifications from 'expo-notifications';
import { newRestState, startRest } from '../../../domain/restTimer';
import { restNotifications } from '../restNotifications.native';

jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { extra: { eas: { projectId: 'project' } } } } }));
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(), getAllScheduledNotificationsAsync: jest.fn(), cancelScheduledNotificationAsync: jest.fn(), scheduleNotificationAsync: jest.fn(),
  getPermissionsAsync: jest.fn(), requestPermissionsAsync: jest.fn(), setNotificationChannelAsync: jest.fn(),
  AndroidImportance: { DEFAULT: 3 }, IosAuthorizationStatus: { PROVISIONAL: 3 }, SchedulableTriggerInputTypes: { DATE: 'date' },
}));
beforeEach(() => {
  jest.spyOn(Date, 'now').mockReturnValue(1000); jest.clearAllMocks();
  jest.mocked(Notifications.getAllScheduledNotificationsAsync).mockResolvedValue([]);
  jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue({ granted: true } as Notifications.NotificationPermissionsStatus);
});
afterEach(() => jest.restoreAllMocks());
function request(identifier: string, data: Record<string, unknown>): Notifications.NotificationRequest {
  return { identifier, trigger: null, content: { title: null, subtitle: null, body: null, categoryIdentifier: null, sound: null, threadIdentifier: null, data } };
}
test('schedules one local deadline and cancels only this project reminders', async () => {
  jest.mocked(Notifications.getAllScheduledNotificationsAsync).mockResolvedValue([
    request('old', { restScope: 'workout-rest:project' }), request('other', { restScope: 'other-project' }),
  ]);
  const state = startRest({ ...newRestState('workout'), reminders: true }, 'Press', 1000, 'timer'); await restNotifications.sync(state);
  expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledTimes(1); expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('old');
  expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(expect.objectContaining({ identifier: 'workout-rest:project:timer', trigger: expect.objectContaining({ date: new Date(91000) }) }));
  expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
});
test('a matching reminder is not rescheduled and pausing cancels it', async () => {
  const state = startRest({ ...newRestState('workout'), reminders: true }, 'Press', 1000, 'timer');
  jest.mocked(Notifications.getAllScheduledNotificationsAsync).mockResolvedValue([request('workout-rest:project:timer', { restScope: 'workout-rest:project', endsAt: 91000 })]);
  await restNotifications.sync(state); expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  await restNotifications.sync({ ...state, timer: { ...state.timer!, endsAt: null } }); expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('workout-rest:project:timer');
});
test('expired timers never schedule a late alarm', async () => {
  const state = startRest({ ...newRestState('workout'), reminders: true }, 'Press', 1000, 'timer'); jest.spyOn(Date, 'now').mockReturnValue(999999);
  await restNotifications.sync(state); expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
});
