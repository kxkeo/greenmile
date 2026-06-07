-- ============================================================
-- Migration 015: Participant player profiles
-- Stores player info linked to a participant account
-- Reusable across camps, alumni game, and future activities
-- ============================================================

CREATE TABLE IF NOT EXISTS participant_players (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  participant_id INTEGER NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  first_name     TEXT    NOT NULL DEFAULT '',
  last_name      TEXT    NOT NULL DEFAULT '',
  dob            TEXT    DEFAULT NULL,          -- YYYY-MM-DD
  positions      TEXT    DEFAULT NULL,          -- JSON array e.g. ["P","CF","1B"]
  shirt_size     TEXT    DEFAULT NULL,          -- 'YS'|'YM'|'YL'|'YXL'|'AS'|'AM'|'AL'|'AXL'|'AXXL'
  notes          TEXT    DEFAULT '',
  created_at     TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_players_participant ON participant_players(participant_id);
