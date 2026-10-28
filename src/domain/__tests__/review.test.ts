import { buildReview, hourLabel, type ReviewInput } from '../review';
import type { DayResult } from '../target';

const day = (d: string, wastedMin: number, hit: boolean): DayResult => ({ day: d, wastedMin, targetMin: 300, hit });

const input = (over: Partial<ReviewInput> = {}): ReviewInput => ({
  lastDay: '2026-11-08',
  days: [day('2026-10-30', 400, false), day('2026-10-31', 400, false), day('2026-11-02', 300, true), day('2026-11-03', 200, true), day('2026-11-08', 350, false)],
  shortVideo: [
    { day: '2026-11-03', packageName: 'com.instagram.android', count: 30, ms: 0, blocked: 0 },
    { day: '2026-11-03', packageName: 'com.google.android.youtube', count: 5, ms: 0, blocked: 0 },
    { day: '2026-10-20', packageName: 'com.instagram.android', count: 99, ms: 0, blocked: 0 },
  ],
  sessions: [],
  habitLogs: [
    { habitId: 'h', day: '2026-11-03' },
    { habitId: 'h', day: '2026-10-01' },
  ],
  gateEvents: [],
  reflections: [
    { day: '2026-11-04', text: 'Read 40 pages' },
    { day: '2026-11-02', text: 'Gym' },
  ],
  byHour: Array.from({ length: 24 }, (_, h) => (h === 22 ? 50 * 60000 : h === 9 ? 10 * 60000 : 0)),
  now: 0,
  ...over,
});

describe('buildReview', () => {
  const r = buildReview(input());

  it('covers the seven days ending on the last day', () => {
    expect([r.from, r.to]).toEqual(['2026-11-02', '2026-11-08']);
  });

  it('totals the week and compares per day with the week before', () => {
    expect(r.totalMin).toBe(850);
    expect(r.previousMin).toBe(1200);
    expect(r.hitDays).toBe(2);
    expect(r.finishedDays).toBe(3);
    expect(r.bestDay?.day).toBe('2026-11-03');
  });

  it('finds the worst hour', () => {
    expect(r.worstHour).toEqual({ hour: 22, minutes: 50 });
  });

  it('counts the week’s short videos, habits and reflections only', () => {
    expect(r.shortVideos).toBe(35);
    expect(r.shortVideosByDay.find((d) => d.day === '2026-11-03')?.count).toBe(35);
    expect(r.habitsDone).toBe(1);
    expect(r.reflections.map((x) => x.text)).toEqual(['Gym', 'Read 40 pages']);
  });

  it('copes with an empty week', () => {
    const empty = buildReview(input({ days: [], byHour: new Array(24).fill(0) }));
    expect(empty.bestDay).toBeNull();
    expect(empty.worstHour).toBeNull();
    expect(empty.previousMin).toBeNull();
  });
});

describe('hourLabel', () => {
  it('formats hours', () => {
    expect([hourLabel(0), hourLabel(9), hourLabel(12), hourLabel(22)]).toEqual(['12 am', '9 am', '12 pm', '10 pm']);
  });
});
