import { foregroundTime, hasUsageAccess } from '../../modules/usage-stats';
import { wastedMinutes, type AppTag } from '@/domain/apps';
import { addDays, daysBetween, startOf, today, type Day } from '@/domain/dates';
import { averageBefore } from '@/domain/target';
import { saveDailyUsage } from '@/db/repo';

/** Android keeps raw usage events for about a week, so older days come from what was saved. */
const LOOKBACK_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Finished days don't change, so one sync per day is enough; this guards against back-to-back reloads. */
const RESYNC_MS = 10 * 60 * 1000;
let lastSync: { day: Day; at: number; byDay: Record<Day, Record<string, number>> } | null = null;

/** Saves the usage of each finished day still on the phone. Days the phone has nothing for keep what was saved. */
export async function syncFinishedDays(): Promise<Record<Day, Record<string, number>>> {
  if (!hasUsageAccess()) return {};
  const current = today();
  if (lastSync && lastSync.day === current && Date.now() - lastSync.at < RESYNC_MS) return lastSync.byDay;
  const byDay: Record<Day, Record<string, number>> = {};
  for (const day of daysBetween(addDays(current, -LOOKBACK_DAYS), current)) {
    const usage = await foregroundTime(startOf(day).getTime(), startOf(addDays(day, 1)).getTime());
    if (Object.keys(usage).length) byDay[day] = usage;
  }
  await saveDailyUsage(byDay);
  lastSync = { day: current, at: Date.now(), byDay };
  return byDay;
}

/** Milliseconds per app from midnight until now. */
export async function usageSoFar(): Promise<Record<string, number>> {
  if (!hasUsageAccess()) return {};
  return foregroundTime(startOf(today()).getTime(), Date.now());
}

/** Usage over the same stretch of the same weekday a week ago, or null if the phone has no data for it. */
export async function usageSameTimeLastWeek(): Promise<Record<string, number> | null> {
  if (!hasUsageAccess()) return null;
  const usage = await foregroundTime(startOf(addDays(today(), -7)).getTime(), Date.now() - 7 * DAY_MS);
  return Object.keys(usage).length ? usage : null;
}

/** Average wasted minutes a day over the past week, for the starting baseline. Null on a phone with no history. */
export async function detectBaseline(tags: Record<string, AppTag>): Promise<number | null> {
  const byDay = await syncFinishedDays();
  const wasted = Object.fromEntries(Object.entries(byDay).map(([day, usage]) => [day, wastedMinutes(usage, tags)]));
  const avg = averageBefore(wasted, today(), LOOKBACK_DAYS);
  return avg === null ? null : Math.round(avg);
}
