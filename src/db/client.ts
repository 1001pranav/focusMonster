import * as SQLite from 'expo-sqlite';
import { MIGRATIONS } from './schema';

let opening: Promise<SQLite.SQLiteDatabase> | null = null;

async function open(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync('focusmonster.db');
  await db.execAsync('PRAGMA journal_mode = WAL;');
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const version = row?.user_version ?? 0;
  for (let v = version; v < MIGRATIONS.length; v++) {
    await db.withExclusiveTransactionAsync(async (tx) => {
      await tx.execAsync(MIGRATIONS[v]);
      await tx.execAsync(`PRAGMA user_version = ${v + 1}`);
    });
  }
  return db;
}

/** The one shared connection, migrated on first use. */
export function getDb(): Promise<SQLite.SQLiteDatabase> {
  opening ??= open().catch((e) => {
    opening = null;
    throw e;
  });
  return opening;
}
