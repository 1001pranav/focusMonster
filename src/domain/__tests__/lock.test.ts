import { cancelGateOff, cancelUntag, LOCK_MS, NO_PENDING, requestGateOff, requestUntag, takeDue, timeUntil } from '../lock';

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
});
