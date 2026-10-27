import { configureGate, drainGateLog } from '../../modules/usage-stats/gate';
import type { GateChoice, GateEvent, GateReason } from '@/domain/gate';
import { gateWhy, nextTask } from '@/domain/gate';
import { DEFAULT_WASTED, type AppTag } from '@/domain/apps';
import type { Day } from '@/domain/dates';
import type { Goal, Task } from '@/domain/tasks';
import { saveGateEvents } from '@/db/repo';

/** Moves the gate's decisions from the native log into SQLite. */
export async function importGateLog(): Promise<void> {
  const events: GateEvent[] = drainGateLog().map((e) => ({
    at: e.at,
    packageName: e.package,
    reason: e.reason as GateReason | null,
    choice: e.choice as GateChoice,
    waitSec: e.waitSec,
  }));
  await saveGateEvents(events);
}

/**
 * Hands the gate what it shows. It reads this while the app is closed, so the target is today's as
 * of the last time the app was opened; a new day keeps yesterday's until then.
 */
export function pushGateConfig(input: { enabled: boolean; tags: Record<string, AppTag>; targetMin: number; tasks: Task[]; goals: Goal[]; day: Day }) {
  const task = nextTask(input.tasks, input.day);
  configureGate({
    enabled: input.enabled,
    wasted: wastedPackages(input.tags),
    targetMin: Math.round(input.targetMin),
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
