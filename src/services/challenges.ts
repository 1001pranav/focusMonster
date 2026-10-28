import { foregroundTime, hasUsageAccess } from '../../modules/usage-stats';
import { wastedMinutes, type AppTag } from '@/domain/apps';
import { minuteOf, type Bedtime } from '@/domain/bedtime';
import { challengeDays, defOf, passes, progressOf, startDayFor, windowOf, type Challenge, type ChallengeDef, type ChallengeProgress } from '@/domain/challenges';
import { addDays, type Day } from '@/domain/dates';
import type { DayResult } from '@/domain/target';
import { loadChallengeDays, loadLatestChallenge, loadShortVideo, saveChallengeDay, startChallengeRow } from '@/db/repo';

/** Android keeps raw usage for about a week; older days that were never measured stay unknown. */
const MEASURABLE_DAYS = 6;
const OWN_PACKAGE = 'com.focusmonster.app';

export async function startChallenge(type: string, current: Day): Promise<void> {
  const def = defOf(type);
  if (def) await startChallengeRow(type, startDayFor(def, current));
}

export interface ActiveChallenge {
  challenge: Challenge;
  def: ChallengeDef;
  progress: ChallengeProgress;
}

/** Measures every day of the latest challenge whose window has closed, then reports its progress. */
export async function checkChallenge(input: { current: Day; tags: Record<string, AppTag>; bedtime: Bedtime; days: DayResult[] }): Promise<ActiveChallenge | null> {
  const challenge = await loadLatestChallenge();
  const def = challenge && defOf(challenge.type);
  if (!challenge || !def) return null;
  const results = await loadChallengeDays(challenge.id);
  const now = Date.now();
  const wakeAt = minuteOf(input.bedtime.enabled ? input.bedtime.end : '07:00');
  for (const day of challengeDays(challenge, def)) {
    if (day in results || day < addDays(input.current, -MEASURABLE_DAYS)) continue;
    const { start, end } = windowOf(def, day, wakeAt);
    if (end > now) continue;
    const measured = await measure(def, day, start, end, input);
    if (measured === null) continue;
    results[day] = passes(def, measured);
    await saveChallengeDay(challenge.id, day, results[day]);
  }
  return { challenge, def, progress: progressOf(challenge, def, results, input.current) };
}

/** Minutes (or short videos) in the window, or null when there's no data to judge by. */
async function measure(def: ChallengeDef, day: Day, start: number, end: number, input: { tags: Record<string, AppTag>; days: DayResult[] }): Promise<number | null> {
  // Without usage access the phone reports nothing, which would read as a perfect day.
  if ((def.metric === 'anyApp' || def.metric === 'wastedApps') && !hasUsageAccess()) return null;
  switch (def.metric) {
    case 'anyApp': {
      const usage = await foregroundTime(start, end);
      return Object.entries(usage).reduce((sum, [pkg, ms]) => (pkg === OWN_PACKAGE ? sum : sum + ms), 0) / 60000;
    }
    case 'wastedApps':
      return wastedMinutes(await foregroundTime(start, end), input.tags);
    case 'shortVideos': {
      const rows = (await loadShortVideo(day)).filter((r) => r.day === day);
      return rows.reduce((sum, r) => sum + r.count, 0);
    }
    case 'target': {
      const result = input.days.find((d) => d.day === day);
      return result ? (result.hit ? 0 : 1) : null;
    }
  }
}
