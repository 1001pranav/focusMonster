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
}

export const NO_PENDING: Pending = { gateOffAt: null, untagAt: {} };

/** A second request doesn't restart the clock. */
export const requestGateOff = (p: Pending, now: number): Pending => ({ ...p, gateOffAt: p.gateOffAt ?? now + LOCK_MS });

export const cancelGateOff = (p: Pending): Pending => ({ ...p, gateOffAt: null });

export const requestUntag = (p: Pending, pkg: string, now: number): Pending => ({ ...p, untagAt: { ...p.untagAt, [pkg]: p.untagAt[pkg] ?? now + LOCK_MS } });

export function cancelUntag(p: Pending, pkg: string): Pending {
  const { [pkg]: _, ...rest } = p.untagAt;
  return { ...p, untagAt: rest };
}

/** The changes whose time has come, and what stays pending. */
export function takeDue(p: Pending, now: number): { gateOff: boolean; untag: string[]; rest: Pending } {
  const gateOff = p.gateOffAt !== null && p.gateOffAt <= now;
  const untag = Object.keys(p.untagAt).filter((pkg) => p.untagAt[pkg] <= now);
  const untagAt = Object.fromEntries(Object.entries(p.untagAt).filter(([, at]) => at > now));
  return { gateOff, untag, rest: { gateOffAt: gateOff ? null : p.gateOffAt, untagAt } };
}

/** "in 23h", "in 40m": how long until a pending change happens. */
export function timeUntil(at: number, now: number): string {
  const min = Math.max(1, Math.ceil((at - now) / 60000));
  return min < 60 ? `in ${min}m` : `in ${Math.floor(min / 60)}h ${String(min % 60).padStart(2, '0')}m`;
}
