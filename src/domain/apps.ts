/** How an app's time counts. Only wasted time is held against the daily target. */
export type AppTag = 'wasted' | 'neutral' | 'productive';

/** Feeds and short-video apps tagged as wasted on first run. The user can change any of them. */
export const DEFAULT_WASTED = new Set([
  'com.instagram.android',
  'com.google.android.youtube',
  'com.facebook.katana',
  'com.facebook.lite',
  'com.snapchat.android',
  'com.twitter.android',
  'com.reddit.frontpage',
  'com.zhiliaoapp.musically',
  'com.ss.android.ugc.trill',
  'com.pinterest',
  'in.mohalla.video',
  'in.mohalla.sharechat',
  'com.eterno.shortvideos',
  'com.next.innovation.takatak',
]);

/** Banking, UPI and wallet apps by name, listed first when choosing apps FocusMonster turns off for. */
const MONEY = /\b(bank|banking|pay|upi|bhim|wallet|yono|imobile|netbanking|finance|money)s?\b/i;
const MONEY_PACKAGES = /(bank|upi|paisa|paytm|phonepe|bhim|wallet|lotusintouch|imobile|kotak|axis|hdfc|icici|sbi)/i;

export const looksLikeMoney = (packageName: string, label: string) => MONEY.test(label) || MONEY_PACKAGES.test(packageName);

export const defaultTag = (packageName: string): AppTag => (DEFAULT_WASTED.has(packageName) ? 'wasted' : 'neutral');

/** Minutes spent in wasted apps, from milliseconds per package. Untagged apps use their default. */
export function wastedMinutes(msByPackage: Record<string, number>, tags: Record<string, AppTag>): number {
  let ms = 0;
  for (const [pkg, value] of Object.entries(msByPackage)) {
    if ((tags[pkg] ?? defaultTag(pkg)) === 'wasted') ms += value;
  }
  return ms / 60000;
}
