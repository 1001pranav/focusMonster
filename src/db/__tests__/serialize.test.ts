import { serialize } from '../serialize';

/** A fake connection that fails like SQLite when a write overlaps an open transaction. */
function fakeDb() {
  let inTransaction = false;
  const log: string[] = [];
  const tick = () => new Promise((r) => setTimeout(r, 5));
  return {
    log,
    async runAsync(sql: string) {
      if (inTransaction) throw new Error('database is locked');
      await tick();
      log.push(sql);
    },
    async withExclusiveTransactionAsync(task: (tx: { runAsync: (sql: string) => Promise<void> }) => Promise<void>) {
      inTransaction = true;
      try {
        await task({ runAsync: async (sql) => (await tick(), void log.push(`tx:${sql}`)) });
      } finally {
        inTransaction = false;
      }
    },
    name: 'focusmonster.db',
  };
}

describe('serialize', () => {
  it('reproduces the bug without it: a write during a transaction fails', async () => {
    const db = fakeDb();
    const tx = db.withExclusiveTransactionAsync(async (t) => t.runAsync('a'));
    await expect(db.runAsync('INSERT focus')).rejects.toThrow('database is locked');
    await tx;
  });

  it('makes the write wait for the transaction instead', async () => {
    const raw = fakeDb();
    const db = serialize(raw);
    const tx = db.withExclusiveTransactionAsync(async (t) => {
      await t.runAsync('a');
      await t.runAsync('b');
    });
    await Promise.all([tx, db.runAsync('INSERT focus')]);
    expect(raw.log).toEqual(['tx:a', 'tx:b', 'INSERT focus']);
  });

  it('keeps going after a failed call', async () => {
    const raw = fakeDb();
    const db = serialize(raw);
    const failing = db.withExclusiveTransactionAsync(async () => {
      throw new Error('boom');
    });
    await expect(failing).rejects.toThrow('boom');
    await db.runAsync('next');
    expect(raw.log).toEqual(['next']);
  });

  it('passes other properties through', () => {
    expect(serialize(fakeDb()).name).toBe('focusmonster.db');
  });
});
