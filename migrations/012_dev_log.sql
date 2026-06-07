CREATE TABLE IF NOT EXISTS dev_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  version     TEXT NOT NULL,
  title       TEXT NOT NULL,
  summary     TEXT NOT NULL,
  built       TEXT NOT NULL DEFAULT '[]',
  pending     TEXT NOT NULL DEFAULT '[]',
  decisions   TEXT NOT NULL DEFAULT '[]',
  snapshot    TEXT NOT NULL DEFAULT '{}',
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
