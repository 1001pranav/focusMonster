/** Bedtime: wasted apps are closed from `start` until `end` plus `morningFreeMin`. Times are 'HH:MM'. */
export interface Bedtime {
  enabled: boolean;
  start: string;
  end: string;
  /** Extra phone-free minutes after waking. */
  morningFreeMin: number;
}

export const DEFAULT_BEDTIME: Bedtime = { enabled: false, start: '23:00', end: '07:00', morningFreeMin: 30 };
export const MORNING_FREE_CHOICES = [0, 30, 60];

const DAY_MIN = 24 * 60;

export const minuteOf = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

export const hhmmOf = (min: number) => {
  const m = ((min % DAY_MIN) + DAY_MIN) % DAY_MIN;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};

/** Whether a minute of the day falls in the window, which may cross midnight. Same as QuietHours in Kotlin. */
export function inWindow(b: Bedtime, minute: number): boolean {
  if (!b.enabled) return false;
  const start = minuteOf(b.start);
  const end = (minuteOf(b.end) + b.morningFreeMin) % DAY_MIN;
  if (start === end) return false;
  return start < end ? minute >= start && minute < end : minute >= start || minute < end;
}

/** When wasted apps open again: the end of the window. */
export const opensAt = (b: Bedtime) => hhmmOf(minuteOf(b.end) + b.morningFreeMin);

/** Weaker means some minute that was protected no longer is. Shifting the window counts. */
export function isWeaker(from: Bedtime, to: Bedtime): boolean {
  for (let m = 0; m < DAY_MIN; m++) if (inWindow(from, m) && !inWindow(to, m)) return true;
  return false;
}
