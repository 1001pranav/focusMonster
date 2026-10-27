import * as Notifications from 'expo-notifications';

const CHANNEL = 'daily';

let configured = false;

export async function configureNotifications() {
  if (configured) return;
  configured = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
  });
  await Notifications.setNotificationChannelAsync(CHANNEL, {
    name: 'Morning plan and nightly recap',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

export async function ensurePermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  return (await Notifications.requestPermissionsAsync()).granted;
}

const parse = (hhmm: string) => {
  const [hour, minute] = hhmm.split(':').map(Number);
  return { hour, minute };
};

/**
 * The text is fixed when it's scheduled, and tomorrow's target depends on how today ends, so the
 * notifications invite the user in rather than quote numbers. Numbers come with the v2 background worker.
 */
export async function scheduleDaily(morningAt: string, nightAt: string): Promise<void> {
  await configureNotifications();
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!(await Notifications.getPermissionsAsync()).granted) return;
  await Notifications.scheduleNotificationAsync({
    content: { title: 'Plan your day', body: 'Pick your Top 3 and see today’s target.' },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, ...parse(morningAt), channelId: CHANNEL },
  });
  await Notifications.scheduleNotificationAsync({
    content: { title: 'How did today go?', body: 'See your time, your streak and what you got done.' },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, ...parse(nightAt), channelId: CHANNEL },
  });
}
