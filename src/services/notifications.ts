import * as Notifications from 'expo-notifications';
import { scheduleBackground } from '../../modules/usage-stats/gate';

const CHANNEL = 'daily';

let configured = false;

/**
 * The morning plan, nightly recap and budget warnings are posted by the native background worker
 * (BudgetWorker), which knows the real numbers. This side only sets up the channel, asks for
 * permission, and posts the focus-session reminder.
 */
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
  await cancelLegacyDaily();
  scheduleBackground();
}

export async function ensurePermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  return (await Notifications.requestPermissionsAsync()).granted;
}

/** v1 scheduled fixed-text daily notifications; the worker replaces them. */
async function cancelLegacyDaily() {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of scheduled) {
    if (n.trigger && 'type' in n.trigger && n.trigger.type === 'daily') await Notifications.cancelScheduledNotificationAsync(n.identifier);
  }
}
