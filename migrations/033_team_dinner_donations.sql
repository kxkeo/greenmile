-- Team dinner potluck donations. Beyond the host, any number of parents can
-- pitch in on food, drinks, or dessert for a dinner. One row per parent per
-- dinner (upserted), shown as a "bringing" list on the Parents page card.

CREATE TABLE IF NOT EXISTS team_dinner_donations (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  dinner_id      INTEGER NOT NULL,
  participant_id INTEGER,
  donor_name     TEXT NOT NULL,
  food           INTEGER NOT NULL DEFAULT 0,
  drinks         INTEGER NOT NULL DEFAULT 0,
  desserts       INTEGER NOT NULL DEFAULT 0,
  created_at     TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tdd_dinner ON team_dinner_donations (dinner_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_tdd_unique ON team_dinner_donations (dinner_id, participant_id);
