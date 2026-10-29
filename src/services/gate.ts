import * as Notifications from 'expo-notifications';
import { configureGate, drainGateLog, pauseService, type PauseResult } from '../../modules/usage-stats/gate';
import type { GateChoice, GateEvent, GateReason } from '@/domain/gate';
import { gateWhy, nextTask } from '@/domain/gate';
import { DEFAULT_WASTED, type AppTag } from '@/domain/apps';
import type { Bedtime } from '@/domain/bedtime';
import type { Day } from '@/domain/dates';
import type { FocusSession } from '@/domain/focus';
import { HABITS_ON_GATE, type Habit } from '@/domain/habits';
import type { Pending } from '@/domain/lock';
import type { ShortsPolicy } from '@/domain/shorts';
import type { Goal, Task } from '@/domain/tasks';
import { endRunningFocus, saveGateEvents } from '@/db/repo';

const KINDS = new Set(['open', 'break', 'focus']);

/**
 * Moves the gate's decisions from the native log into SQLite. A focus session ended from the gate
 * arrives here too, as 'focus_end', and ends the session in the database.
 */
export async function importGateLog(): Promise<void> {
  const events: GateEvent[] = [];
  for (const e of drainGateLog()) {
    if (e.choice === 'focus_end') {
      await endRunningFocus(e.at);
      continue;
    }
    events.push({
      at: e.at,
      packageName: e.package,
      reason: e.reason as GateReason | null,
      choice: e.choice as GateChoice,
      waitSec: e.waitSec,
      kind: (e.kind && KINDS.has(e.kind) ? e.kind : 'open') as GateEvent['kind'],
      habitId: e.habitId ?? null,
    });
  }
  await saveGateEvents(events);
}

/**
 * Hands the gate what it shows. It reads this while the app is closed, so the target is today's as
 * of the last time the app was opened; a new day keeps yesterday's until then.
 */
export function pushGateConfig(input: { enabled: boolean; pending: Pending; shorts: ShortsPolicy; focus: FocusSession | null; habits: Habit[]; nextIfHit: number; morningAt: string; nightAt: string; bedtime: Bedtime; overlay: boolean; pauseApps: string[]; tags: Record<string, AppTag>; targetMin: number; tasks: Task[]; goals: Goal[]; day: Day }) {
  const task = nextTask(input.tasks, input.day);
  configureGate({
    enabled: input.enabled,
    // The gate switches these off on time by itself, even if FocusMonster isn't opened.
    offAt: input.pending.gateOffAt ?? 0,
    wasted: wastedPackages(input.tags),
    releaseAt: input.pending.untagAt,
    shorts: input.shorts,
    shortsNext: input.pending.shortsNext ?? null,
    focusUntil: input.focus?.plannedEnd ?? 0,
    focusTask: input.tasks.find((t) => t.id === input.focus?.taskId)?.title ?? null,
    instead: input.habits.slice(0, HABITS_ON_GATE).map((h) => ({ id: h.id, title: h.title })),
    // The native side picks tomorrow's target itself from these, before the app is opened again.
    day: input.day,
    targetMin: Math.round(input.targetMin),
    ifHitMin: Math.round(input.nextIfHit),
    ifMissMin: Math.round(input.targetMin),
    morningAt: input.morningAt,
    nightAt: input.nightAt,
    bedtime: input.bedtime,
    bedtimeNext: input.pending.bedtimeNext ?? null,
    overlay: input.overlay,
    overlayOffAt: input.pending.overlayOffAt ?? 0,
    pauseApps: input.pauseApps,
    nextTask: task?.title ?? null,
    why: gateWhy(input.goals, task),
  });
}

/** Apps tagged as wasted, plus default ones installed after tagging (they count until the user says otherwise). */
export function wastedPackages(tags: Record<string, AppTag>): string[] {
  const tagged = Object.entries(tags).filter(([, tag]) => tag === 'wasted').map(([pkg]) => pkg);
  const untaggedDefaults = [...DEFAULT_WASTED].filter((pkg) => !(pkg in tags));
  return [...tagged, ...untaggedDefaults];
}

const RESUME_REMINDER = 'resume-gate';
export const PAUSE_MIN = 15;

/**
 * For banking and UPI apps that refuse to open while any accessibility service is on. With the adb
 * grant the service comes back on by itself after PAUSE_MIN minutes; without it only the user can
 * turn it back on, so a reminder follows.
 */
export async function pauseForBanking(): Promise<PauseResult> {
  const result = pauseService(PAUSE_MIN);
  if (result !== 'paused') return result;
  await Notifications.cancelScheduledNotificationAsync(RESUME_REMINDER).catch(() => {});
  await Notifications.scheduleNotificationAsync({
    identifier: RESUME_REMINDER,
    content: { title: 'FocusMonster is still paused', body: 'Done with your banking app? Tap to turn the gate and the Reels counter back on.' },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(Date.now() + PAUSE_MIN * 60000), channelId: 'daily' },
  }).catch((e) => console.warn(e));
  return result;
}
