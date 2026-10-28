import { averageBefore, evaluate, targetFor, type Plan } from '../target';

const plan: Plan = { baselineMin: 360, floorMin: 60, startDay: '2026-11-01' };

describe('targetFor', () => {
  it('starts one step below the baseline', () => {
    expect(targetFor(plan, 0)).toBe(355);
  });

  it('compounds about 10% a week of hits', () => {
    expect(targetFor(plan, 6)).toBe(324);
  });

  it('never goes below the floor', () => {
    expect(targetFor(plan, 1000)).toBe(60);
  });
});

describe('evaluate', () => {
  it('lowers the target after a hit and holds it after a miss', () => {
    const { days, todayTarget } = evaluate(plan, { '2026-11-01': 300, '2026-11-02': 400, '2026-11-03': 340 }, '2026-11-04');
    expect(days.map((d) => [d.targetMin, d.hit])).toEqual([
      [355, true],
      [349, false],
      [349, true],
    ]);
    expect(todayTarget).toBe(344);
    expect(evaluate(plan, { '2026-11-01': 300, '2026-11-02': 400, '2026-11-03': 340 }, '2026-11-04').nextIfHit).toBe(339);
  });

  it('skips days without data', () => {
    const { days, todayTarget } = evaluate(plan, { '2026-11-02': 100 }, '2026-11-04');
    expect(days.map((d) => d.day)).toEqual(['2026-11-02']);
    expect(todayTarget).toBe(349);
  });

  it('ignores today and days before the start', () => {
    const { days } = evaluate(plan, { '2026-10-31': 10, '2026-11-01': 10 }, '2026-11-01');
    expect(days).toEqual([]);
  });

  it('counts a day exactly on target as a hit', () => {
    expect(evaluate(plan, { '2026-11-01': 355 }, '2026-11-02').days[0].hit).toBe(true);
  });
});

describe('averageBefore', () => {
  it('averages the days that have data', () => {
    expect(averageBefore({ '2026-11-01': 100, '2026-11-03': 200, '2026-11-04': 999 }, '2026-11-04', 7)).toBe(150);
  });

  it('is null without data', () => {
    expect(averageBefore({}, '2026-11-04', 7)).toBeNull();
  });
});
