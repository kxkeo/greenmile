CREATE TABLE IF NOT EXISTS campaigns (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  type          TEXT    NOT NULL,
  title         TEXT    NOT NULL DEFAULT '',
  description   TEXT    NOT NULL DEFAULT '',
  status        TEXT    NOT NULL DEFAULT 'draft',
  event_date    TEXT    DEFAULT NULL,
  event_time    TEXT    DEFAULT NULL,
  location      TEXT    DEFAULT NULL,
  reg_opens_at  TEXT    DEFAULT NULL,
  reg_closes_at TEXT    DEFAULT NULL,
  price_cents   INTEGER DEFAULT NULL,
  meta          TEXT    NOT NULL DEFAULT '{}',
  created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_type   ON campaigns(type);
