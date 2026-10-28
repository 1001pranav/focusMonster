import type { AppTag } from '@/domain/apps';
import type { GateEvent } from '@/domain/gate';
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
}

const DEFAULTS: Settings = { onboarded: false, plan: null, morningAt: '08:00', nightAt: '21:30', gateEnabled: false };

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
      await tx.runAsync('INSERT INTO gate_events (at, package, reason, choice, wait_sec) VALUES (?, ?, ?, ?, ?)', [e.at, e.packageName, e.reason, e.choice, e.waitSec]);
    }
  });
}

export async function loadGateEvents(sinceMs: number): Promise<GateEvent[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ at: number; package: string; reason: GateEvent['reason']; choice: GateEvent['choice']; wait_sec: number }>(
    'SELECT * FROM gate_events WHERE at >= ? ORDER BY at',
    [sinceMs],
  );
  return rows.map((r) => ({ at: r.at, packageName: r.package, reason: r.reason, choice: r.choice, waitSec: r.wait_sec }));
}
