import type { Day } from './dates';

/** What happens in Reels and Shorts. Matches ShortsPolicy in the native module. */
export type ShortsMode = 'count' | 'pause' | 'block';

export interface ShortsPolicy {
  mode: ShortsMode;
  /** With 'pause': a break every this many videos. */
  limit: number;
}

export const DEFAULT_SHORTS: ShortsPolicy = { mode: 'pause', limit: 20 };
export const LIMIT_CHOICES = [10, 20, 30];

const STRENGTH: Record<ShortsMode, number> = { count: 0, pause: 1, block: 2 };

/** Weaker means more scrolling allowed: a gentler mode, or pausing less often. It waits out the lock. */
export function isWeaker(from: ShortsPolicy, to: ShortsPolicy): boolean {
  if (STRENGTH[to.mode] !== STRENGTH[from.mode]) return STRENGTH[to.mode] < STRENGTH[from.mode];
  return to.mode === 'pause' && to.limit > from.limit;
}

export const SHORT_VIDEO_APPS: Record<string, string> = {
  'com.instagram.android': 'Reels',
  'com.google.android.youtube': 'Shorts',
};

export interface ShortVideoDay {
  day: Day;
  packageName: string;
  count: number;
  ms: number;
  blocked: number;
}

export interface ShortVideoLine {
  label: string;
  count: number;
  minutes: number;
  blocked: number;
  /** The same app yesterday, or null without data. */
  yesterday: number | null;
}

/** One line per short-video app for the day, Reels first. */
export function shortVideoLines(rows: ShortVideoDay[], day: Day, yesterday: Day): ShortVideoLine[] {
  return Object.entries(SHORT_VIDEO_APPS).flatMap(([pkg, label]) => {
    const today = rows.find((r) => r.packageName === pkg && r.day === day);
    const before = rows.find((r) => r.packageName === pkg && r.day === yesterday);
    if (!today && !before) return [];
    return [{ label, count: today?.count ?? 0, minutes: (today?.ms ?? 0) / 60000, blocked: today?.blocked ?? 0, yesterday: before ? before.count : null }];
  });
}
