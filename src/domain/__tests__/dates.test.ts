import { addDays, dayOf, daysBetween, formatMinutes } from '../dates';

describe('dates', () => {
  it('formats local days', () => {
    expect(dayOf(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });

  it('adds days across months and years', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('lists days up to the end, exclusive', () => {
    expect(daysBetween('2026-10-30', '2026-11-02')).toEqual(['2026-10-30', '2026-10-31', '2026-11-01']);
    expect(daysBetween('2026-10-30', '2026-10-30')).toEqual([]);
  });

  it('formats minutes', () => {
    expect(formatMinutes(45)).toBe('45m');
    expect(formatMinutes(125)).toBe('2h 05m');
    expect(formatMinutes(-3)).toBe('0m');
  });
});
