/** The calls that touch the database; everything else on the connection passes straight through. */
const QUEUED = new Set(['execAsync', 'runAsync', 'getFirstAsync', 'getAllAsync', 'withExclusiveTransactionAsync', 'withTransactionAsync']);

/**
 * Runs every database call on `db` one at a time, in the order made. Without this, a write made
 * while another call holds an exclusive transaction fails with "database is locked" (expo-sqlite
 * runs those on a second connection), and the user's action is silently lost.
 *
 * Inside a transaction, use only its own `tx` object: a call on the queued `db` there would wait
 * for the transaction that is waiting for it.
 */
export function serialize<T extends object>(db: T): T {
  let lane: Promise<unknown> = Promise.resolve();
  const queued = <R>(work: () => Promise<R>): Promise<R> => {
    const run = lane.then(work);
    lane = run.catch(() => {});
    return run;
  };
  return new Proxy(db, {
    get(target, prop) {
      const value = Reflect.get(target, prop, target);
      if (typeof value !== 'function') return value;
      if (typeof prop === 'string' && QUEUED.has(prop)) return (...args: unknown[]) => queued(() => value.apply(target, args));
      return value.bind(target);
    },
  });
}
