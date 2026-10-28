import { DEFAULT_BEDTIME, inWindow, isWeaker, minuteOf, opensAt } from '../bedtime';

const on = { ...DEFAULT_BEDTIME, enabled: true };

describe('bedtime', () => {
  it('covers the night across midnight, plus the phone-free morning', () => {
    expect(inWindow(on, minuteOf('23:30'))).toBe(true);
    expect(inWindow(on, minuteOf('03:00'))).toBe(true);
    expect(inWindow(on, minuteOf('07:15'))).toBe(true);
    expect(inWindow(on, minuteOf('07:30'))).toBe(false);
    expect(inWindow(on, minuteOf('22:59'))).toBe(false);
  });

  it('handles a window within one day', () => {
    expect(inWindow({ ...on, start: '13:00', end: '14:00', morningFreeMin: 0 }, minuteOf('13:30'))).toBe(true);
  });

  it('is off when disabled', () => {
    expect(inWindow(DEFAULT_BEDTIME, minuteOf('03:00'))).toBe(false);
  });

  it('says when apps open again', () => {
    expect(opensAt(on)).toBe('07:30');
    expect(opensAt({ ...on, end: '23:45', morningFreeMin: 30 })).toBe('00:15');
  });

  it('treats any lost protected minute as weaker', () => {
    expect(isWeaker(on, { ...on, enabled: false })).toBe(true);
    expect(isWeaker(on, { ...on, start: '01:00' })).toBe(true);
    expect(isWeaker(on, { ...on, morningFreeMin: 0 })).toBe(true);
    expect(isWeaker(on, { ...on, start: '22:00', morningFreeMin: 60 })).toBe(false);
    expect(isWeaker(DEFAULT_BEDTIME, on)).toBe(false);
  });
});
