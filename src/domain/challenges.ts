import { addDays, daysBetween, startOf, type Day } from './dates';

/** What a challenge measures in its daily window. */
export type Metric = 'anyApp' | 'wastedApps' | 'shortVideos' | 'target';

export interface ChallengeDef {
  type: string;
  title: string;
  description: string;
  days: number;
  /** Days that must pass. */
  required: number;
  startsOn: 'today' | 'saturday';
  metric: Metric;
  /** Daily window as minutes of the day; 'wake' starts at the wake-up time. Unused for 'target'. */
  window?: { from: number | 'wake'; minutes: number };
  /** Most minutes (or short videos) allowed in the window. */
  allowed: number;
}

export const CHALLENGES: ChallengeDef[] = [
  { type: 'morning', title: 'No phone the first hour after waking', description: 'Under 5 minutes of any app in the hour after your wake-up time, 6 days of 7.', days: 7, required: 6, startsOn: 'today', metric: 'anyApp', window: { from: 'wake', minutes: 60 }, allowed: 5 },
  { type: 'dinner', title: 'Phone-free dinner', description: 'Under 5 minutes of any app between 19:30 and 20:30, 6 days of 7.', days: 7, required: 6, startsOn: 'today', metric: 'anyApp', window: { from: 19 * 60 + 30, minutes: 60 }, allowed: 5 },
  { type: 'late', title: 'No wasted apps after 22:00', description: 'Under 5 minutes in wasted apps from 22:00 to midnight, 6 days of 7.', days: 7, required: 6, startsOn: 'today', metric: 'wastedApps', window: { from: 22 * 60, minutes: 120 }, allowed: 5 },
  { type: 'weekend', title: 'Zero Reels and Shorts weekend', description: 'Not a single short video on Saturday and Sunday.', days: 2, required: 2, startsOn: 'saturday', metric: 'shortVideos', allowed: 0 },
  { type: 'target', title: 'On target 5 days of 7', description: 'Stay under your daily target on at least 5 of the next 7 days.', days: 7, required: 5, startsOn: 'today', metric: 'target', allowed: 0 },
];

export const defOf = (type: string) => CHALLENGES.find((c) => c.type === type) ?? null;

export interface Challenge {
  id: string;
  type: string;
  startDay: Day;
  /** Set when the user gives up or picks another. */
  ended: boolean;
}

/** Today, or the coming Saturday for weekend challenges. */
export function startDayFor(def: ChallengeDef, current: Day): Day {
  if (def.startsOn === 'today') return current;
  const weekday = startOf(current).getDay();
  return addDays(current, (6 - weekday + 7) % 7);
}

export const challengeDays = (c: Challenge, def: ChallengeDef) => daysBetween(c.startDay, addDays(c.startDay, def.days));

/** The window to measure on `day`, in epoch ms. */
export function windowOf(def: ChallengeDef, day: Day, wakeAt: number): { start: number; end: number } {
  const midnight = startOf(day).getTime();
  if (!def.window) return { start: midnight, end: startOf(addDays(day, 1)).getTime() };
  const from = def.window.from === 'wake' ? wakeAt : def.window.from;
  const start = midnight + from * 60000;
  return { start, end: start + def.window.minutes * 60000 };
}

export const passes = (def: ChallengeDef, measured: number) => measured <= def.allowed;

export type ChallengeStatus = 'upcoming' | 'running' | 'won' | 'lost' | 'ended';

export interface ChallengeProgress {
  status: ChallengeStatus;
  passed: number;
  failed: number;
  /** One entry per day: true passed, false failed, null not measured yet. */
  results: (boolean | null)[];
}

/** Won as soon as enough days pass; lost as soon as too many fail to win. */
export function progressOf(c: Challenge, def: ChallengeDef, results: Record<Day, boolean>, current: Day): ChallengeProgress {
  const days = challengeDays(c, def);
  const list = days.map((d) => (d in results ? results[d] : null));
  const passed = list.filter((r) => r === true).length;
  const failed = list.filter((r) => r === false).length;
  const status: ChallengeStatus =
    passed >= def.required ? 'won' : failed > def.days - def.required ? 'lost' : c.ended ? 'ended' : current < c.startDay ? 'upcoming' : 'running';
  return { status, passed, failed, results: list };
}
