import type { Bedtime } from './bedtime';
import type { ShortsPolicy } from './shorts';

/**
 * Commitment lock: anything that weakens the user's protection waits 24 hours, anything that
 * strengthens it happens at once. The decision is made by the calm daytime self, not by the
 * midnight self who wants one more reel.
 */
export const LOCK_MS = 24 * 60 * 60 * 1000;

export interface Pending {
  /** When the mindful gate turns off, if the user asked for that. */
  gateOffAt: number | null;
  /** Apps leaving the wasted list, and when they stop counting. */
  untagAt: Record<string, number>;
  /** A weaker Reels/Shorts policy, and when it starts. Missing in data saved before it existed. */
  shortsNext?: (ShortsPolicy & { at: number }) | null;
  /** A weaker bedtime, and when it starts. */
  bedtimeNext?: (Bedtime & { at: number }) | null;
  /** When the live Reels/Shorts counter turns off. */
  overlayOffAt?: number | null;
}

export const NO_PENDING: Pending = { gateOffAt: null, untagAt: {}, shortsNext: null, bedtimeNext: null, overlayOffAt: null };

/** A second request doesn't restart the clock. */
export const requestGateOff = (p: Pending, now: number): Pending => ({ ...p, gateOffAt: p.gateOffAt ?? now + LOCK_MS });

export const cancelGateOff = (p: Pending): Pending => ({ ...p, gateOffAt: null });

export const requestOverlayOff = (p: Pending, now: number): Pending => ({ ...p, overlayOffAt: p.overlayOffAt ?? now + LOCK_MS });

export const cancelOverlayOff = (p: Pending): Pending => ({ ...p, overlayOffAt: null });

export const requestUntag = (p: Pending, pkg: string, now: number): Pending => ({ ...p, untagAt: { ...p.untagAt, [pkg]: p.untagAt[pkg] ?? now + LOCK_MS } });

export function cancelUntag(p: Pending, pkg: string): Pending {
  const { [pkg]: _, ...rest } = p.untagAt;
  return { ...p, untagAt: rest };
}

/** A later weaker request replaces the policy but keeps the original deadline. */
export const requestShorts = (p: Pending, policy: ShortsPolicy, now: number): Pending => ({ ...p, shortsNext: { ...policy, at: p.shortsNext?.at ?? now + LOCK_MS } });

export const requestBedtime = (p: Pending, bedtime: Bedtime, now: number): Pending => ({ ...p, bedtimeNext: { ...bedtime, at: p.bedtimeNext?.at ?? now + LOCK_MS } });

export const cancelBedtime = (p: Pending): Pending => ({ ...p, bedtimeNext: null });

export const cancelShorts = (p: Pending): Pending => ({ ...p, shortsNext: null });

/** The changes whose time has come, and what stays pending. */
export function takeDue(p: Pending, now: number): { gateOff: boolean; overlayOff: boolean; untag: string[]; shorts: ShortsPolicy | null; bedtime: Bedtime | null; rest: Pending } {
  const gateOff = p.gateOffAt !== null && p.gateOffAt <= now;
  const untag = Object.keys(p.untagAt).filter((pkg) => p.untagAt[pkg] <= now);
  const untagAt = Object.fromEntries(Object.entries(p.untagAt).filter(([, at]) => at > now));
  const next = p.shortsNext ?? null;
  const shortsDue = next !== null && next.at <= now;
  const bed = p.bedtimeNext ?? null;
  const bedDue = bed !== null && bed.at <= now;
  const overlayOff = p.overlayOffAt != null && p.overlayOffAt <= now;
  return {
    gateOff,
    overlayOff,
    untag,
    shorts: shortsDue ? { mode: next.mode, limit: next.limit } : null,
    bedtime: bedDue ? { enabled: bed.enabled, start: bed.start, end: bed.end, morningFreeMin: bed.morningFreeMin } : null,
    rest: { gateOffAt: gateOff ? null : p.gateOffAt, untagAt, shortsNext: shortsDue ? null : next, bedtimeNext: bedDue ? null : bed, overlayOffAt: overlayOff ? null : (p.overlayOffAt ?? null) },
  };
}

/** "in 23h", "in 40m": how long until a pending change happens. */
export function timeUntil(at: number, now: number): string {
  const min = Math.max(1, Math.ceil((at - now) / 60000));
  return min < 60 ? `in ${min}m` : `in ${Math.floor(min / 60)}h ${String(min % 60).padStart(2, '0')}m`;
}
