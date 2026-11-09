import Constants from 'expo-constants';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { AndroidImportance, IosAuthorizationStatus } from 'expo-notifications';
import type { RestState } from '../../domain/restTimer';

const scope = `workout-rest:${Constants.expoConfig?.extra?.eas?.projectId ?? Constants.expoConfig?.slug ?? 'workout-journal'}`;
const channelId = 'workout-rest';
let configured = false;
export const restNotifications = {
  available: true,
  enable: async () => {
    if (Platform.OS === 'android') await Notifications.setNotificationChannelAsync(channelId, { name: 'Workout rest', importance: AndroidImportance.DEFAULT, sound: 'default' });
    const current = await Notifications.getPermissionsAsync();
    if (current.granted || current.ios?.status === IosAuthorizationStatus.PROVISIONAL) return true;
    const result = await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowSound: true, allowBadge: false } });
    return result.granted || result.ios?.status === IosAuthorizationStatus.PROVISIONAL;
  },
  sync: async (state: RestState | null) => {
    if (!configured) {
      Notifications.setNotificationHandler({ handleNotification: async notification => {
        const owned = notification.request.content.data?.restScope === scope;
        return { shouldShowBanner: owned, shouldShowList: owned, shouldPlaySound: owned, shouldSetBadge: false };
      } }); configured = true;
    }
    const timer = state?.reminders ? state.timer : null;
    const desired = timer?.endsAt && timer.endsAt > Date.now() ? { id: `${scope}:${timer.id}`, endsAt: timer.endsAt } : null;
    const requests = await Notifications.getAllScheduledNotificationsAsync();
    let alreadyScheduled = false;
    for (const request of requests) {
      if (request.content.data?.restScope !== scope) continue;
      if (desired && request.identifier === desired.id && request.content.data?.endsAt === desired.endsAt) alreadyScheduled = true;
      else await Notifications.cancelScheduledNotificationAsync(request.identifier);
    }
    if (!desired || alreadyScheduled) return;
    const permissions = await Notifications.getPermissionsAsync();
    if (!permissions.granted && permissions.ios?.status !== IosAuthorizationStatus.PROVISIONAL) throw new Error('Notifications are off. The countdown still works.');
    await Notifications.scheduleNotificationAsync({ identifier: desired.id,
      content: { title: 'Rest complete', body: 'Ready for your next set?', sound: 'default', data: { restScope: scope, endsAt: desired.endsAt } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(desired.endsAt), channelId },
    });
  },
};
