import { wastedMinutes } from '../apps';

describe('wastedMinutes', () => {
  const usage = { 'com.instagram.android': 30 * 60000, 'com.google.android.apps.maps': 20 * 60000, 'com.example.game': 10 * 60000 };

  it('counts default wasted apps only', () => {
    expect(wastedMinutes(usage, {})).toBe(30);
  });

  it('follows the user’s tags over the defaults', () => {
    expect(wastedMinutes(usage, { 'com.instagram.android': 'neutral', 'com.example.game': 'wasted' })).toBe(10);
  });
});
