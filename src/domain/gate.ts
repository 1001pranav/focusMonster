import type { Day } from './dates';
import type { Goal, Task } from './tasks';

/** Keys stored by the native gate screen (GateActivity.REASONS). */
export type GateReason = 'bored' | 'avoiding' | 'tired' | 'lonely' | 'habit' | 'specific';
export type GateChoice = 'closed' | 'continued' | 'left';

export const REASON_LABELS: Record<GateReason, string> = {
  bored: 'Bored',
  avoiding: 'Avoiding something',
  tired: 'Tired',
  lonely: 'Lonely',
  habit: 'Just habit',
  specific: 'Something specific',
};

export interface GateEvent {
  at: number;
  packageName: string;
  reason: GateReason | null;
  choice: GateChoice;
  waitSec: number;
  kind: 'open' | 'break';
}

export interface GateSummary {
  /** Times the gate opened. */
  shown: number;
  /** Times the user closed the app or walked away instead of going in. */
  turnedBack: number;
  /** Reasons given, most common first. */
  reasons: { reason: GateReason; count: number }[];
}

/** Leaving the gate with the home button counts as turning back: the app wasn't opened. */
export function summarize(events: GateEvent[]): GateSummary {
  const counts = new Map<GateReason, number>();
  for (const e of events) if (e.reason) counts.set(e.reason, (counts.get(e.reason) ?? 0) + 1);
  return {
    shown: events.length,
    turnedBack: events.filter((e) => e.choice !== 'continued').length,
    reasons: [...counts].map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count),
  };
}

/** The first open task of the day: what the gate suggests doing instead. */
export const nextTask = (tasks: Task[], day: Day) => tasks.find((t) => t.day === day && t.status === 'todo') ?? null;

/** The why shown on the gate: the next task's goal if it has one, else the first goal with a why. */
export function gateWhy(goals: Goal[], task: Task | null): string | null {
  const own = task?.goalId ? goals.find((g) => g.id === task.goalId && g.why) : undefined;
  return (own ?? goals.find((g) => g.why))?.why ?? null;
}
