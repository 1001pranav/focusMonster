import { looksLikeMoney, wastedMinutes } from '../apps';

describe('wastedMinutes', () => {
  const usage = { 'com.instagram.android': 30 * 60000, 'com.google.android.apps.maps': 20 * 60000, 'com.example.game': 10 * 60000 };

  it('counts default wasted apps only', () => {
    expect(wastedMinutes(usage, {})).toBe(30);
  });

  it('follows the user’s tags over the defaults', () => {
    expect(wastedMinutes(usage, { 'com.instagram.android': 'neutral', 'com.example.game': 'wasted' })).toBe(10);
  });
});

describe('looksLikeMoney', () => {
  it('spots banks and UPI apps by name or package', () => {
    expect(looksLikeMoney('com.sbi.lotusintouch', 'YONO SBI')).toBe(true);
    expect(looksLikeMoney('com.google.android.apps.nbu.paisa.user', 'Google Pay')).toBe(true);
    expect(looksLikeMoney('com.phonepe.app', 'PhonePe')).toBe(true);
    expect(looksLikeMoney('com.csam.icici.bank.imobile', 'iMobile Pay')).toBe(true);
  });

  it('leaves other apps alone', () => {
    expect(looksLikeMoney('com.whatsapp', 'WhatsApp')).toBe(false);
    expect(looksLikeMoney('com.spotify.music', 'Spotify')).toBe(false);
    expect(looksLikeMoney('com.example.paywall', 'Paywalls Daily')).toBe(false);
  });
});
