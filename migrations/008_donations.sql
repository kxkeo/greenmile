CREATE TABLE IF NOT EXISTS donations (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  first_name     TEXT    NOT NULL DEFAULT '',
  last_name      TEXT    NOT NULL DEFAULT '',
  email          TEXT    DEFAULT NULL,
  amount_cents   INTEGER NOT NULL DEFAULT 0,
  tier_id        TEXT    DEFAULT NULL,
  tier_label     TEXT    DEFAULT NULL,
  want_receipt   INTEGER NOT NULL DEFAULT 0,
  payment_status TEXT    NOT NULL DEFAULT 'pending',
  notes          TEXT    DEFAULT '',
  created_at     TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_donations_created ON donations(created_at);
CREATE INDEX IF NOT EXISTS idx_donations_status  ON donations(payment_status);
