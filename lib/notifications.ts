import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

const onboardingChannelId = 'finassist-onboarding';

export async function initializeNotifications() {
  if (Platform.OS !== 'android') {
    return;
  }

  await Notifications.setNotificationChannelAsync(onboardingChannelId, {
    name: 'FinAssist Reminders',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 200, 120, 200],
    lightColor: '#0E9B10',
  });
}

export async function requestNotificationPermission() {
  const existingPermissions = await Notifications.getPermissionsAsync();

  if (existingPermissions.granted) {
    return existingPermissions;
  }

  return Notifications.requestPermissionsAsync();
}

export async function scheduleOnboardingNotification() {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'FinAssist notifications are on',
      body: "We'll alert you before overspending and send smart reminders to keep you on track.",
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 5,
      channelId: Platform.OS === 'android' ? onboardingChannelId : undefined,
    },
  });
}
