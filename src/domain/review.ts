import { addDays, daysBetween, type Day } from './dates';
import { focusedMinutes, type FocusSession } from './focus';
import { summarize, type GateEvent, type GateSummary } from './gate';
import type { HabitLog } from './habits';
import type { ShortVideoDay } from './shorts';
import type { DayResult } from './target';

export interface Reflection {
  day: Day;
  text: string;
}

export interface WeekReview {
  from: Day;
  to: Day;
  /** Wasted minutes this week and the week before, over the days that have data. */
  totalMin: number;
  previousMin: number | null;
  avgMin: number;
  hitDays: number;
  finishedDays: number;
  bestDay: DayResult | null;
  /** Local hour (0-23) with the most wasted time, and its total minutes. */
  worstHour: { hour: number; minutes: number } | null;
  shortVideos: number;
  shortVideosByDay: { day: Day; count: number }[];
  focusMin: number;
  habitsDone: number;
  gate: GateSummary;
  reflections: Reflection[];
}

export interface ReviewInput {
  /** The last day of the week under review: usually yesterday, the last finished day. */
  lastDay: Day;
  days: DayResult[];
  shortVideo: ShortVideoDay[];
  sessions: FocusSession[];
  habitLogs: HabitLog[];
  gateEvents: GateEvent[];
  reflections: Reflection[];
  /** Wasted milliseconds per local hour over the week. */
  byHour: number[];
  now: number;
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

export function buildReview(input: ReviewInput): WeekReview {
  const from = addDays(input.lastDay, -6);
  const to = input.lastDay;
  const inWeek = (d: Day) => d >= from && d <= to;
  const week = input.days.filter((d) => inWeek(d.day));
  const before = input.days.filter((d) => d.day >= addDays(from, -7) && d.day < from);
  const totalMin = sum(week.map((d) => d.wastedMin));
  const worst = input.byHour.reduce((best, ms, hour) => (ms > best.ms ? { hour, ms } : best), { hour: -1, ms: 0 });
  const shorts = input.shortVideo.filter((r) => inWeek(r.day));
  return {
    from,
    to,
    totalMin,
    // Compared per day, so a week with fewer days of data isn't flattered.
    previousMin: before.length ? (sum(before.map((d) => d.wastedMin)) / before.length) * (week.length || 1) : null,
    avgMin: week.length ? totalMin / week.length : 0,
    hitDays: week.filter((d) => d.hit).length,
    finishedDays: week.length,
    bestDay: week.length ? week.reduce((a, b) => (b.wastedMin < a.wastedMin ? b : a)) : null,
    worstHour: worst.hour >= 0 ? { hour: worst.hour, minutes: worst.ms / 60000 } : null,
    shortVideos: sum(shorts.map((r) => r.count)),
    shortVideosByDay: daysBetween(from, addDays(to, 1)).map((day) => ({ day, count: sum(shorts.filter((r) => r.day === day).map((r) => r.count)) })),
    focusMin: sum(input.sessions.map((s) => focusedMinutes(s, input.now))),
    habitsDone: input.habitLogs.filter((l) => inWeek(l.day)).length,
    gate: summarize(input.gateEvents),
    reflections: input.reflections.filter((r) => inWeek(r.day)).sort((a, b) => a.day.localeCompare(b.day)),
  };
}

/** "9 pm", "12 am". */
export function hourLabel(hour: number): string {
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h} ${hour < 12 ? 'am' : 'pm'}`;
}
