import type { DayResult } from './target';

/** Minutes won back: how far each finished day came in under the baseline. Over-baseline days count 0. */
export function reclaimedMinutes(days: DayResult[], baselineMin: number): number {
  return days.reduce((sum, d) => sum + Math.max(0, baselineMin - d.wastedMin), 0);
}

/** Whole days of the year that `minPerDay` adds up to: 10h a day is 152 days. */
export const daysPerYear = (minPerDay: number) => Math.round((minPerDay * 365) / 60 / 24);
