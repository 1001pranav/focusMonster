import type { AppTag } from '@/domain/apps';
import { DEFAULT_BEDTIME, type Bedtime } from '@/domain/bedtime';
import type { Challenge } from '@/domain/challenges';
import type { FocusSession } from '@/domain/focus';
import type { GateEvent } from '@/domain/gate';
import type { Reflection } from '@/domain/review';
import type { Habit, HabitLog } from '@/domain/habits';
import { NO_PENDING, type Pending } from '@/domain/lock';
import { DEFAULT_SHORTS, type ShortsPolicy, type ShortVideoDay } from '@/domain/shorts';
import type { Day } from '@/domain/dates';
import type { Plan } from '@/domain/target';
import { newId, type Goal, type Task, type TaskStatus } from '@/domain/tasks';
import { getDb } from './client';

// Settings

export interface Settings {
  onboarded: boolean;
  plan: Plan | null;
  /** 'HH:MM', local time. */
  morningAt: string;
  nightAt: string;
  /** The user wants the mindful gate; it only runs once the accessibility service is on too. */
  gateEnabled: boolean;
  /** Changes that weaken a protection, waiting out the 24-hour lock (src/domain/lock.ts). */
  pending: Pending;
  shorts: ShortsPolicy;
  bedtime: Bedtime;
  /** The live counter over Reels/Shorts. */
  shortsOverlay: boolean;
  /** Apps FocusMonster turns itself off for, because they won't run with an accessibility service on. */
  pauseApps: string[];
}

const DEFAULTS: Settings = { onboarded: false, plan: null, morningAt: '08:00', nightAt: '21:30', gateEnabled: false, pending: NO_PENDING, shorts: DEFAULT_SHORTS, bedtime: DEFAULT_BEDTIME, shortsOverlay: true, pauseApps: [] };

export async function loadSettings(): Promise<Settings> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ key: string; value: string }>('SELECT key, value FROM settings');
  const stored = Object.fromEntries(rows.map((r) => [r.key, JSON.parse(r.value)]));
  return { ...DEFAULTS, ...stored };
}

export async function saveSettings(patch: Partial<Settings>): Promise<void> {
  const db = await getDb();
  await db.withExclusiveTransactionAsync(async (tx) => {
    for (const [key, value] of Object.entries(patch)) {
      await tx.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, JSON.stringify(value)]);
    }
  });
}

// App tags

export async function loadTags(): Promise<Record<string, AppTag>> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ package: string; tag: AppTag }>('SELECT package, tag FROM app_tags');
  return Object.fromEntries(rows.map((r) => [r.package, r.tag]));
}

/** App names as the launcher shows them, saved when the apps were tagged. */
export async function loadAppLabels(): Promise<Record<string, string>> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ package: string; label: string }>('SELECT package, label FROM app_tags');
  return Object.fromEntries(rows.map((r) => [r.package, r.label]));
}

/** Changes the tag of apps already listed. */
export async function setTags(tags: Record<string, AppTag>): Promise<void> {
  const db = await getDb();
  await db.withExclusiveTransactionAsync(async (tx) => {
    for (const [pkg, tag] of Object.entries(tags)) await tx.runAsync('UPDATE app_tags SET tag = ? WHERE package = ?', [tag, pkg]);
  });
}

export async function saveTags(tags: { packageName: string; label: string; tag: AppTag }[]): Promise<void> {
  const db = await getDb();
  await db.withExclusiveTransactionAsync(async (tx) => {
    for (const t of tags) {
      await tx.runAsync('INSERT OR REPLACE INTO app_tags (package, label, tag) VALUES (?, ?, ?)', [t.packageName, t.label, t.tag]);
    }
  });
}

// Daily usage

/** Replaces the recorded usage of each given day. */
export async function saveDailyUsage(byDay: Record<Day, Record<string, number>>): Promise<void> {
  const db = await getDb();
  await db.withExclusiveTransactionAsync(async (tx) => {
    for (const [day, usage] of Object.entries(byDay)) {
      await tx.runAsync('DELETE FROM daily_usage WHERE day = ?', [day]);
      for (const [pkg, ms] of Object.entries(usage)) {
        await tx.runAsync('INSERT INTO daily_usage (day, package, ms) VALUES (?, ?, ?)', [day, pkg, Math.round(ms)]);
      }
    }
  });
}

export async function loadDailyUsage(fromDay: Day): Promise<Record<Day, Record<string, number>>> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ day: Day; package: string; ms: number }>('SELECT day, package, ms FROM daily_usage WHERE day >= ?', [fromDay]);
  const out: Record<Day, Record<string, number>> = {};
  for (const r of rows) (out[r.day] ??= {})[r.package] = r.ms;
  return out;
}

// Goals

interface GoalRow {
  id: string;
  title: string;
  why: string;
  archived: number;
  created_at: number;
}

const toGoal = (r: GoalRow): Goal => ({ id: r.id, title: r.title, why: r.why, archived: r.archived === 1, createdAt: r.created_at });

export async function loadGoals(): Promise<Goal[]> {
  const db = await getDb();
  return (await db.getAllAsync<GoalRow>('SELECT * FROM goals WHERE archived = 0 ORDER BY created_at')).map(toGoal);
}

export async function saveGoal(goal: { id?: string; title: string; why: string }): Promise<void> {
  const db = await getDb();
  if (goal.id) {
    await db.runAsync('UPDATE goals SET title = ?, why = ? WHERE id = ?', [goal.title, goal.why, goal.id]);
  } else {
    await db.runAsync('INSERT INTO goals (id, title, why, created_at) VALUES (?, ?, ?, ?)', [newId(), goal.title, goal.why, Date.now()]);
  }
}

/** Archived, not deleted: its tasks keep their history. */
export async function archiveGoal(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE goals SET archived = 1 WHERE id = ?', [id]);
}

// Tasks

interface TaskRow {
  id: string;
  title: string;
  goal_id: string | null;
  day: Day;
  status: TaskStatus;
  created_at: number;
}

const toTask = (r: TaskRow): Task => ({ id: r.id, title: r.title, goalId: r.goal_id, day: r.day, status: r.status, createdAt: r.created_at });

export async function loadTasks(fromDay: Day): Promise<Task[]> {
  const db = await getDb();
  return (await db.getAllAsync<TaskRow>("SELECT * FROM tasks WHERE day >= ? OR status = 'todo' ORDER BY created_at", [fromDay])).map(toTask);
}

export async function addTask(title: string, goalId: string | null, day: Day): Promise<void> {
  const db = await getDb();
  await db.runAsync("INSERT INTO tasks (id, title, goal_id, day, status, created_at) VALUES (?, ?, ?, ?, 'todo', ?)", [newId(), title, goalId, day, Date.now()]);
}

export async function setTaskStatus(id: string, status: TaskStatus): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE tasks SET status = ? WHERE id = ?', [status, id]);
}

export async function moveTask(id: string, day: Day): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE tasks SET day = ? WHERE id = ?', [day, id]);
}

// Gate events

export async function saveGateEvents(events: GateEvent[]): Promise<void> {
  if (!events.length) return;
  const db = await getDb();
  await db.withExclusiveTransactionAsync(async (tx) => {
    for (const e of events) {
      await tx.runAsync('INSERT INTO gate_events (at, package, reason, choice, wait_sec, kind, habit_id) VALUES (?, ?, ?, ?, ?, ?, ?)', [e.at, e.packageName, e.reason, e.choice, e.waitSec, e.kind, e.habitId]);
    }
  });
}

export async function loadGateEvents(sinceMs: number): Promise<GateEvent[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ at: number; package: string; reason: GateEvent['reason']; choice: GateEvent['choice']; wait_sec: number; kind: GateEvent['kind']; habit_id: string | null }>(
    'SELECT * FROM gate_events WHERE at >= ? ORDER BY at',
    [sinceMs],
  );
  return rows.map((r) => ({ at: r.at, packageName: r.package, reason: r.reason, choice: r.choice, waitSec: r.wait_sec, kind: r.kind, habitId: r.habit_id }));
}

// Short videos

/** Replaces the given days' rows: the native counter is the source of truth while it still has them. */
export async function saveShortVideo(rows: ShortVideoDay[]): Promise<void> {
  if (!rows.length) return;
  const db = await getDb();
  await db.withExclusiveTransactionAsync(async (tx) => {
    for (const r of rows) {
      await tx.runAsync('INSERT OR REPLACE INTO short_video (day, package, count, ms, blocked) VALUES (?, ?, ?, ?, ?)', [r.day, r.packageName, r.count, r.ms, r.blocked]);
    }
  });
}

export async function loadShortVideo(fromDay: Day): Promise<ShortVideoDay[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ day: Day; package: string; count: number; ms: number; blocked: number }>('SELECT * FROM short_video WHERE day >= ?', [fromDay]);
  return rows.map((r) => ({ day: r.day, packageName: r.package, count: r.count, ms: r.ms, blocked: r.blocked }));
}

// Focus sessions

interface FocusRow {
  id: string;
  task_id: string | null;
  goal_id: string | null;
  started_at: number;
  planned_end: number;
  ended_at: number | null;
}

const toSession = (r: FocusRow): FocusSession => ({ id: r.id, taskId: r.task_id, goalId: r.goal_id, startedAt: r.started_at, plannedEnd: r.planned_end, endedAt: r.ended_at });

export async function loadFocusSessions(sinceMs: number): Promise<FocusSession[]> {
  const db = await getDb();
  return (await db.getAllAsync<FocusRow>('SELECT * FROM focus_sessions WHERE started_at >= ? ORDER BY started_at', [sinceMs])).map(toSession);
}

export async function addFocusSession(s: FocusSession): Promise<void> {
  const db = await getDb();
  await db.runAsync('INSERT INTO focus_sessions (id, task_id, goal_id, started_at, planned_end, ended_at) VALUES (?, ?, ?, ?, ?, NULL)', [s.id, s.taskId, s.goalId, s.startedAt, s.plannedEnd]);
}

/** Ends whichever session is running at `at`. */
export async function endRunningFocus(at: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE focus_sessions SET ended_at = ? WHERE ended_at IS NULL AND started_at <= ? AND planned_end > ?', [at, at, at]);
}

// Habits

export async function loadHabits(): Promise<Habit[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ id: string; title: string; created_at: number }>('SELECT * FROM habits WHERE archived = 0 ORDER BY created_at');
  return rows.map((r) => ({ id: r.id, title: r.title, createdAt: r.created_at }));
}

export async function addHabit(title: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('INSERT INTO habits (id, title, created_at) VALUES (?, ?, ?)', [newId(), title, Date.now()]);
}

export async function archiveHabit(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE habits SET archived = 1 WHERE id = ?', [id]);
}

export async function loadHabitLogs(fromDay: Day): Promise<HabitLog[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ habit_id: string; day: Day }>('SELECT * FROM habit_logs WHERE day >= ?', [fromDay]);
  return rows.map((r) => ({ habitId: r.habit_id, day: r.day }));
}

export async function setHabitDone(habitId: string, day: Day, done: boolean): Promise<void> {
  const db = await getDb();
  if (done) await db.runAsync('INSERT OR IGNORE INTO habit_logs (habit_id, day) VALUES (?, ?)', [habitId, day]);
  else await db.runAsync('DELETE FROM habit_logs WHERE habit_id = ? AND day = ?', [habitId, day]);
}

// Reflections

export async function saveReflection(day: Day, text: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('INSERT OR REPLACE INTO reflections (day, text, created_at) VALUES (?, ?, ?)', [day, text, Date.now()]);
}

export async function loadReflections(fromDay: Day): Promise<Reflection[]> {
  const db = await getDb();
  return db.getAllAsync<Reflection>('SELECT day, text FROM reflections WHERE day >= ? ORDER BY day', [fromDay]);
}

// Challenges

/** The most recent challenge, finished or not. */
export async function loadLatestChallenge(): Promise<Challenge | null> {
  const db = await getDb();
  const r = await db.getFirstAsync<{ id: string; type: string; start_day: Day; ended: number }>('SELECT * FROM challenges ORDER BY created_at DESC LIMIT 1');
  return r ? { id: r.id, type: r.type, startDay: r.start_day, ended: r.ended === 1 } : null;
}

/** Starts a challenge; the previous one, if still open, ends. */
export async function startChallengeRow(type: string, startDay: Day): Promise<void> {
  const db = await getDb();
  await db.withExclusiveTransactionAsync(async (tx) => {
    await tx.runAsync('UPDATE challenges SET ended = 1 WHERE ended = 0');
    await tx.runAsync('INSERT INTO challenges (id, type, start_day, created_at) VALUES (?, ?, ?, ?)', [newId(), type, startDay, Date.now()]);
  });
}

export async function endChallenge(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE challenges SET ended = 1 WHERE id = ?', [id]);
}

export async function loadChallengeDays(id: string): Promise<Record<Day, boolean>> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ day: Day; passed: number }>('SELECT day, passed FROM challenge_days WHERE challenge_id = ?', [id]);
  return Object.fromEntries(rows.map((r) => [r.day, r.passed === 1]));
}

export async function saveChallengeDay(id: string, day: Day, passed: boolean): Promise<void> {
  const db = await getDb();
  await db.runAsync('INSERT OR REPLACE INTO challenge_days (challenge_id, day, passed) VALUES (?, ?, ?)', [id, day, passed ? 1 : 0]);
}
