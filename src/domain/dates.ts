/** A calendar day in the phone's time zone, as 'YYYY-MM-DD'. Days are compared as strings. */
export type Day = string;

const pad = (n: number) => String(n).padStart(2, '0');

export function dayOf(date: Date): Day {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export const today = (): Day => dayOf(new Date());

/** Local midnight at the start of the day. */
export function startOf(day: Day): Date {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(day: Day, n: number): Day {
  const date = startOf(day);
  date.setDate(date.getDate() + n);
  return dayOf(date);
}

/** Days from `from` up to but not including `to`. */
export function daysBetween(from: Day, to: Day): Day[] {
  const out: Day[] = [];
  for (let d = from; d < to; d = addDays(d, 1)) out.push(d);
  return out;
}

/** "2h 05m", "45m". */
export function formatMinutes(min: number): string {
  const m = Math.max(0, Math.round(min));
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${pad(m % 60)}m`;
}
