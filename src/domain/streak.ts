import type { DayResult } from './target';

/** Every 7 hits in a row earn a freeze; a freeze covers one missed day. At most 2 are kept. */
export const HITS_PER_FREEZE = 7;
export const MAX_FREEZES = 2;

export interface Streak {
  current: number;
  best: number;
  freezes: number;
}

/** A missed day uses a freeze if there is one, which keeps the streak but doesn't add to it. */
export function streakOf(days: DayResult[]): Streak {
  let current = 0;
  let best = 0;
  let freezes = 0;
  let towardFreeze = 0;
  for (const d of days) {
    if (d.hit) {
      current++;
      best = Math.max(best, current);
      if (++towardFreeze === HITS_PER_FREEZE) {
        towardFreeze = 0;
        freezes = Math.min(MAX_FREEZES, freezes + 1);
      }
    } else if (freezes > 0) {
      freezes--;
    } else {
      current = 0;
      towardFreeze = 0;
    }
  }
  return { current, best, freezes };
}
