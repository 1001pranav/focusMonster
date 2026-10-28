import { addDays, startOf, type Day } from './dates';
import type { Task } from './tasks';

export const FOCUS_CHOICES = [25, 50];

export interface FocusSession {
  id: string;
  taskId: string | null;
  goalId: string | null;
  startedAt: number;
  plannedEnd: number;
  /** When it was ended early from the gate or the app; null while running or when it ran to the end. */
  endedAt: number | null;
}

export type FocusStatus = 'running' | 'done' | 'abandoned';

export function statusOf(s: FocusSession, now: number): FocusStatus {
  if (s.endedAt !== null && s.endedAt < s.plannedEnd) return 'abandoned';
  return now < s.plannedEnd ? 'running' : 'done';
}

/** Minutes actually spent: an abandoned session still counts up to the moment it ended. */
export function focusedMinutes(s: FocusSession, now: number): number {
  const end = Math.min(s.endedAt ?? s.plannedEnd, s.plannedEnd, now);
  return Math.max(0, (end - s.startedAt) / 60000);
}

export const running = (sessions: FocusSession[], now: number) => sessions.find((s) => statusOf(s, now) === 'running') ?? null;

/** The session's goal: its own, or its task's. */
export const goalOf = (s: FocusSession, tasks: Task[]) => s.goalId ?? tasks.find((t) => t.id === s.taskId)?.goalId ?? null;

/** Focus minutes per goal over the 7 days ending `day`. */
export function weeklyFocusByGoal(sessions: FocusSession[], tasks: Task[], day: Day, now: number): Record<string, number> {
  const from = startOf(addDays(day, -6)).getTime();
  const out: Record<string, number> = {};
  for (const s of sessions) {
    if (s.startedAt < from) continue;
    const goal = goalOf(s, tasks);
    if (goal) out[goal] = (out[goal] ?? 0) + focusedMinutes(s, now);
  }
  return out;
}

/** Focus minutes since midnight. */
export const focusedToday = (sessions: FocusSession[], day: Day, now: number) =>
  sessions.filter((s) => s.startedAt >= startOf(day).getTime()).reduce((sum, s) => sum + focusedMinutes(s, now), 0);
