-- ============================================================
-- Migration 013: Generic event registrations
-- Covers: Alumni Game, Fundraiser Event, Other
-- Golf and Camp have their own dedicated tables
-- ============================================================

CREATE TABLE IF NOT EXISTS event_registrations (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  campaign_id     INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  participant_id  INTEGER NOT NULL REFERENCES participants(id),

  -- Contact info (pre-filled from account, editable at checkout)
  first_name      TEXT    NOT NULL DEFAULT '',
  last_name       TEXT    NOT NULL DEFAULT '',
  email           TEXT    DEFAULT NULL,
  phone           TEXT    DEFAULT NULL,
  address         TEXT    DEFAULT NULL,
  city            TEXT    DEFAULT NULL,
  state           TEXT    DEFAULT NULL,
  zip             TEXT    DEFAULT NULL,

  -- Tickets
  ticket_qty      INTEGER NOT NULL DEFAULT 1,
  total_cents     INTEGER NOT NULL DEFAULT 0,

  -- Alumni-specific
  shirt_size      TEXT    DEFAULT NULL,  -- 'YS'|'YM'|'YL'|'AS'|'AM'|'AL'|'AXL'|'A2XL'|'A3XL'

  -- Payment
  payment_status  TEXT    NOT NULL DEFAULT 'pending',  -- 'pending'|'paid'|'pay_at_event'|'refunded'
  stripe_session  TEXT    DEFAULT NULL,

  -- Check-in
  checked_in      INTEGER NOT NULL DEFAULT 0,
  checked_in_at   TEXT    DEFAULT NULL,
  checked_in_by   TEXT    DEFAULT NULL,

  notes           TEXT    DEFAULT '',
  created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_event_reg_campaign    ON event_registrations(campaign_id);
CREATE INDEX IF NOT EXISTS idx_event_reg_participant ON event_registrations(participant_id);
CREATE INDEX IF NOT EXISTS idx_event_reg_status      ON event_registrations(payment_status);
