import type { Day } from './dates';

export const MAX_HABITS = 5;
/** On the gate, as "Instead:" choices. */
export const HABITS_ON_GATE = 3;

export const SUGGESTED_HABITS = ['Read 10 pages', '15-minute walk', 'Stretch for 5 minutes', 'Call family', 'Drink a glass of water', 'Tidy one thing'];

export interface Habit {
  id: string;
  title: string;
  createdAt: number;
}

export interface HabitLog {
  habitId: string;
  day: Day;
}

export const doneOn = (logs: HabitLog[], habitId: string, day: Day) => logs.some((l) => l.habitId === habitId && l.day === day);

/** Suggestions the user doesn't have yet. */
export const suggestionsFor = (habits: Habit[]) => SUGGESTED_HABITS.filter((t) => !habits.some((h) => h.title.toLowerCase() === t.toLowerCase()));
