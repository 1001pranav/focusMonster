import type { Day } from './dates';

export const MAX_GOALS = 3;
export const MAX_TASKS_PER_DAY = 3;

export type TaskStatus = 'todo' | 'done' | 'dropped';

export interface Goal {
  id: string;
  title: string;
  why: string;
  archived: boolean;
  createdAt: number;
}

export interface Task {
  id: string;
  title: string;
  goalId: string | null;
  day: Day;
  status: TaskStatus;
  createdAt: number;
}

/** Tasks still open from earlier days: the user carries each to today or drops it. */
export const leftOver = (tasks: Task[], current: Day) => tasks.filter((t) => t.status === 'todo' && t.day < current);

/** Today's Top 3 holds dropped tasks too, but only open and done ones take a slot. */
export const slotsLeft = (tasks: Task[], current: Day) =>
  MAX_TASKS_PER_DAY - tasks.filter((t) => t.day === current && t.status !== 'dropped').length;

export const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
