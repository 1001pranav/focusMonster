import { requestOverlayOff, cancelOverlayOff, requestBedtime, cancelShorts, requestShorts, cancelGateOff, cancelUntag, LOCK_MS, NO_PENDING, requestGateOff, requestUntag, takeDue, timeUntil } from '../lock';

describe('commitment lock', () => {
  it('turns the gate off a day after asking', () => {
    const p = requestGateOff(NO_PENDING, 1000);
    expect(p.gateOffAt).toBe(1000 + LOCK_MS);
    expect(takeDue(p, 1000 + LOCK_MS - 1).gateOff).toBe(false);
    const due = takeDue(p, 1000 + LOCK_MS);
    expect(due.gateOff).toBe(true);
    expect(due.rest.gateOffAt).toBeNull();
  });

  it('doesn’t restart the clock when asked again', () => {
    const p = requestGateOff(requestGateOff(NO_PENDING, 0), 5000);
    expect(p.gateOffAt).toBe(LOCK_MS);
  });

  it('cancels', () => {
    expect(cancelGateOff(requestGateOff(NO_PENDING, 0)).gateOffAt).toBeNull();
    expect(cancelUntag(requestUntag(NO_PENDING, 'ig', 0), 'ig').untagAt).toEqual({});
  });

  it('releases only the apps whose time has come', () => {
    const p = requestUntag(requestUntag(NO_PENDING, 'ig', 0), 'yt', 10_000);
    const due = takeDue(p, LOCK_MS + 1);
    expect(due.untag).toEqual(['ig']);
    expect(due.rest.untagAt).toEqual({ yt: 10_000 + LOCK_MS });
  });

  it('says how long is left', () => {
    expect(timeUntil(LOCK_MS, 0)).toBe('in 24h 00m');
    expect(timeUntil(40 * 60000, 0)).toBe('in 40m');
    expect(timeUntil(0, 10)).toBe('in 1m');
  });

  it('switches to a weaker Reels/Shorts policy a day later', () => {
    const p = requestShorts(NO_PENDING, { mode: 'count', limit: 0 }, 0);
    expect(takeDue(p, LOCK_MS - 1).shorts).toBeNull();
    const due = takeDue(p, LOCK_MS);
    expect(due.shorts).toEqual({ mode: 'count', limit: 0 });
    expect(due.rest.shortsNext).toBeNull();
    expect(cancelShorts(p).shortsNext).toBeNull();
  });

  it('keeps the first deadline when the weaker choice changes', () => {
    const p = requestShorts(requestShorts(NO_PENDING, { mode: 'pause', limit: 30 }, 0), { mode: 'count', limit: 0 }, 5000);
    expect(p.shortsNext).toEqual({ mode: 'count', limit: 0, at: LOCK_MS });
  });

  it('reads pending data saved before Reels/Shorts existed', () => {
    expect(takeDue({ gateOffAt: null, untagAt: {} }, 0).shorts).toBeNull();
  });

  it('switches to a weaker bedtime a day later', () => {
    const later = { enabled: true, start: '01:00', end: '07:00', morningFreeMin: 0 };
    const p = requestBedtime(NO_PENDING, later, 0);
    expect(takeDue(p, LOCK_MS - 1).bedtime).toBeNull();
    expect(takeDue(p, LOCK_MS).bedtime).toEqual(later);
  });

  it('turns the live counter off a day later', () => {
    const p = requestOverlayOff(NO_PENDING, 0);
    expect(takeDue(p, LOCK_MS - 1).overlayOff).toBe(false);
    expect(takeDue(p, LOCK_MS).overlayOff).toBe(true);
    expect(cancelOverlayOff(p).overlayOffAt).toBeNull();
  });
});
