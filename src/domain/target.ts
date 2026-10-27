import { addDays, daysBetween, type Day } from './dates';

/**
 * The daily target shrinks by 1.5% after every day the user hits it: about 10% a week, compounding.
 * A missed day doesn't move it, so a bad day costs a day of progress, never a penalty.
 */
export const DAILY_STEP = 0.985;

export interface Plan {
  /** Typical wasted minutes a day before starting. */
  baselineMin: number;
  /** The goal: the target never goes below this. */
  floorMin: number;
  /** First day with a target. */
  startDay: Day;
}

export interface DayResult {
  day: Day;
  wastedMin: number;
  targetMin: number;
  hit: boolean;
}

export function targetFor(plan: Plan, hits: number): number {
  return Math.max(plan.floorMin, Math.round(plan.baselineMin * DAILY_STEP ** (hits + 1)));
}

/**
 * Results of every finished day from the plan's start, and today's target. A day with no recorded
 * usage (the phone was off, or its data was lost) is left out: it neither counts as a hit nor a miss.
 */
export function evaluate(plan: Plan, wastedByDay: Record<Day, number>, current: Day): { days: DayResult[]; todayTarget: number } {
  const days: DayResult[] = [];
  let hits = 0;
  for (const day of daysBetween(plan.startDay, current)) {
    const wastedMin = wastedByDay[day];
    if (wastedMin === undefined) continue;
    const targetMin = targetFor(plan, hits);
    const hit = wastedMin <= targetMin;
    if (hit) hits++;
    days.push({ day, wastedMin, targetMin, hit });
  }
  return { days, todayTarget: targetFor(plan, hits) };
}

/** Average of the days that have data among the `n` days before `current`, or null if none do. */
export function averageBefore(wastedByDay: Record<Day, number>, current: Day, n: number): number | null {
  const values = daysBetween(addDays(current, -n), current)
    .map((d) => wastedByDay[d])
    .filter((v): v is number => v !== undefined);
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
}
