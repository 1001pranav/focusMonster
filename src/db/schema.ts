/** Each entry upgrades the database by one version (PRAGMA user_version). Never edit a shipped one. */
export const MIGRATIONS: string[] = [
  `
  CREATE TABLE settings (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);
  CREATE TABLE app_tags (package TEXT PRIMARY KEY NOT NULL, label TEXT NOT NULL, tag TEXT NOT NULL);
  -- Finished days only: today is always read live from the phone.
  CREATE TABLE daily_usage (day TEXT NOT NULL, package TEXT NOT NULL, ms INTEGER NOT NULL, PRIMARY KEY (day, package));
  CREATE TABLE goals (id TEXT PRIMARY KEY NOT NULL, title TEXT NOT NULL, why TEXT NOT NULL, archived INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL);
  CREATE TABLE tasks (id TEXT PRIMARY KEY NOT NULL, title TEXT NOT NULL, goal_id TEXT, day TEXT NOT NULL, status TEXT NOT NULL, created_at INTEGER NOT NULL);
  CREATE INDEX tasks_day ON tasks (day);
  `,
  `
  -- One row per mindful-gate decision, imported from the native log (modules/usage-stats/gate.ts).
  CREATE TABLE gate_events (at INTEGER NOT NULL, package TEXT NOT NULL, reason TEXT, choice TEXT NOT NULL, wait_sec INTEGER NOT NULL);
  CREATE INDEX gate_events_at ON gate_events (at);
  `,
  `
  -- Reels/Shorts per day and app, copied from the native counter (src/services/shorts.ts).
  CREATE TABLE short_video (day TEXT NOT NULL, package TEXT NOT NULL, count INTEGER NOT NULL, ms INTEGER NOT NULL, blocked INTEGER NOT NULL, PRIMARY KEY (day, package));
  -- 'open' when a wasted app was opened, 'break' for a pause in the middle of Reels/Shorts.
  ALTER TABLE gate_events ADD COLUMN kind TEXT NOT NULL DEFAULT 'open';
  `,
  `
  CREATE TABLE focus_sessions (id TEXT PRIMARY KEY NOT NULL, task_id TEXT, goal_id TEXT, started_at INTEGER NOT NULL, planned_end INTEGER NOT NULL, ended_at INTEGER);
  CREATE TABLE habits (id TEXT PRIMARY KEY NOT NULL, title TEXT NOT NULL, archived INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL);
  CREATE TABLE habit_logs (habit_id TEXT NOT NULL, day TEXT NOT NULL, PRIMARY KEY (habit_id, day));
  -- The habit picked from the gate's "Instead" list.
  ALTER TABLE gate_events ADD COLUMN habit_id TEXT;
  `,
  `
  -- The nightly one-liner: what the reclaimed time went to.
  CREATE TABLE reflections (day TEXT PRIMARY KEY NOT NULL, text TEXT NOT NULL, created_at INTEGER NOT NULL);
  `,
];
