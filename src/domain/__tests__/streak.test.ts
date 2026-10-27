import { streakOf } from '../streak';
import type { DayResult } from '../target';

const days = (pattern: string): DayResult[] =>
  [...pattern].map((c, i) => ({ day: `d${i}`, wastedMin: 0, targetMin: 0, hit: c === 'x' }));

describe('streakOf', () => {
  it('counts hits in a row', () => {
    expect(streakOf(days('xxx'))).toEqual({ current: 3, best: 3, freezes: 0 });
  });

  it('resets on a miss without a freeze', () => {
    expect(streakOf(days('xxx.xx'))).toEqual({ current: 2, best: 3, freezes: 0 });
  });

  it('earns a freeze every 7 hits and spends it on a miss', () => {
    expect(streakOf(days('xxxxxxx'))).toMatchObject({ current: 7, freezes: 1 });
    expect(streakOf(days('xxxxxxx.x'))).toEqual({ current: 8, best: 8, freezes: 0 });
  });

  it('keeps at most 2 freezes', () => {
    expect(streakOf(days('x'.repeat(28))).freezes).toBe(2);
  });

  it('handles no days', () => {
    expect(streakOf([])).toEqual({ current: 0, best: 0, freezes: 0 });
  });
});
