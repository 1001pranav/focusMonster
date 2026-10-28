import { isWeaker, shortVideoLines } from '../shorts';

describe('isWeaker', () => {
  it('ranks block over pause over count', () => {
    expect(isWeaker({ mode: 'block', limit: 0 }, { mode: 'pause', limit: 20 })).toBe(true);
    expect(isWeaker({ mode: 'count', limit: 0 }, { mode: 'block', limit: 0 })).toBe(false);
  });

  it('treats pausing less often as weaker', () => {
    expect(isWeaker({ mode: 'pause', limit: 10 }, { mode: 'pause', limit: 30 })).toBe(true);
    expect(isWeaker({ mode: 'pause', limit: 30 }, { mode: 'pause', limit: 10 })).toBe(false);
  });
});

describe('shortVideoLines', () => {
  const rows = [
    { day: '2026-11-02', packageName: 'com.instagram.android', count: 34, ms: 18 * 60000, blocked: 0 },
    { day: '2026-11-01', packageName: 'com.instagram.android', count: 50, ms: 0, blocked: 0 },
    { day: '2026-11-01', packageName: 'com.google.android.youtube', count: 5, ms: 0, blocked: 0 },
  ];

  it('shows today with yesterday to compare', () => {
    expect(shortVideoLines(rows, '2026-11-02', '2026-11-01')).toEqual([
      { label: 'Reels', count: 34, minutes: 18, blocked: 0, yesterday: 50 },
      { label: 'Shorts', count: 0, minutes: 0, blocked: 0, yesterday: 5 },
    ]);
  });

  it('leaves out apps with no data', () => {
    expect(shortVideoLines(rows.slice(0, 1), '2026-11-02', '2026-11-01').map((l) => l.label)).toEqual(['Reels']);
  });
});
