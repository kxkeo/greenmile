-- Migration 027: audit log for event-day actions
-- Every check-in, shirt hand-out, and payment-received toggle triggered by
-- Event Staff / Staff / Admin on the /staff/alumni (and future event pages)
-- writes a row here so we can answer "who did what, when?" after the fact.

CREATE TABLE IF NOT EXISTS event_logs (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_id     INTEGER,               -- users.id (null for built-in admin)
  actor_role   TEXT,                  -- 'admin' | 'staff' | 'event_staff'
  actor_name   TEXT,                  -- snapshot of actor name at time of action
  action       TEXT NOT NULL,         -- e.g. 'check_in', 'undo_check_in',
                                      --      'shirt_given', 'shirt_undo',
                                      --      'payment_received', 'payment_undo'
  target_type  TEXT NOT NULL,         -- 'event_registration'
  target_id    INTEGER NOT NULL,
  target_label TEXT,                  -- "First Last — Emperors Alumni Game"
  campaign_id  INTEGER,
  meta         TEXT,                  -- optional JSON payload
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_event_logs_created  ON event_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_event_logs_campaign ON event_logs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_event_logs_target   ON event_logs(target_type, target_id);
