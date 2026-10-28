import * as Notifications from 'expo-notifications';
import type { FocusSession } from '@/domain/focus';
import { newId } from '@/domain/tasks';
import { addFocusSession, endRunningFocus } from '@/db/repo';

const DONE_NOTIFICATION = 'focus-done';

/** Starts a session. Wasted apps close as soon as the Today screen pushes the gate config. */
export async function startFocus(minutes: number, taskId: string | null, goalId: string | null): Promise<void> {
  const now = Date.now();
  const session: FocusSession = { id: newId(), taskId, goalId, startedAt: now, plannedEnd: now + minutes * 60000, endedAt: null };
  await addFocusSession(session);
  await Notifications.cancelScheduledNotificationAsync(DONE_NOTIFICATION).catch(() => {});
  await Notifications.scheduleNotificationAsync({
    identifier: DONE_NOTIFICATION,
    content: { title: 'Focus session done', body: `${minutes} minutes of real work. Your apps are open again.` },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(session.plannedEnd), channelId: 'daily' },
  }).catch((e) => console.warn(e));
}

export async function endFocusEarly(): Promise<void> {
  await endRunningFocus(Date.now());
  await Notifications.cancelScheduledNotificationAsync(DONE_NOTIFICATION).catch(() => {});
}
