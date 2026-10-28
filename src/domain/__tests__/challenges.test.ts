import { CHALLENGES, defOf, progressOf, startDayFor, windowOf, type Challenge } from '../challenges';
import { startOf } from '../dates';

const MIN = 60000;
const week = defOf('dinner')!;
const challenge = (over: Partial<Challenge> = {}): Challenge => ({ id: 'c', type: 'dinner', startDay: '2026-11-02', ended: false, ...over });

describe('challenges', () => {
  it('has unique types', () => {
    expect(new Set(CHALLENGES.map((c) => c.type)).size).toBe(CHALLENGES.length);
  });

  it('starts weekend challenges on the coming Saturday', () => {
    const weekend = defOf('weekend')!;
    expect(startDayFor(weekend, '2026-11-04')).toBe('2026-11-07');
    expect(startDayFor(weekend, '2026-11-07')).toBe('2026-11-07');
    expect(startDayFor(week, '2026-11-04')).toBe('2026-11-04');
  });

  it('measures the daily window, from the wake-up time when asked', () => {
    const midnight = startOf('2026-11-02').getTime();
    expect(windowOf(week, '2026-11-02', 0)).toEqual({ start: midnight + (19 * 60 + 30) * MIN, end: midnight + (20 * 60 + 30) * MIN });
    expect(windowOf(defOf('morning')!, '2026-11-02', 7 * 60).start).toBe(midnight + 7 * 60 * MIN);
  });

  it('is won once enough days pass', () => {
    const results = Object.fromEntries(['02', '03', '04', '05', '06', '07'].map((d) => [`2026-11-${d}`, true]));
    expect(progressOf(challenge(), week, results, '2026-11-08').status).toBe('won');
  });

  it('is lost once winning is out of reach', () => {
    const p = progressOf(challenge(), week, { '2026-11-02': false, '2026-11-03': false }, '2026-11-04');
    expect(p.status).toBe('lost');
    expect(progressOf(challenge(), week, { '2026-11-02': false }, '2026-11-04').status).toBe('running');
  });

  it('shows one result per day, null until measured', () => {
    const p = progressOf(challenge(), week, { '2026-11-02': true }, '2026-11-03');
    expect(p.results).toEqual([true, null, null, null, null, null, null]);
  });

  it('is upcoming before its start, and ended when given up', () => {
    expect(progressOf(challenge({ startDay: '2026-11-07' }), week, {}, '2026-11-04').status).toBe('upcoming');
    expect(progressOf(challenge({ ended: true }), week, {}, '2026-11-04').status).toBe('ended');
  });
});
