-- ============================================================
-- Migration 014: Add alumni-specific fields to event_registrations
-- ============================================================

ALTER TABLE event_registrations ADD COLUMN grad_year  TEXT DEFAULT NULL;
ALTER TABLE event_registrations ADD COLUMN positions   TEXT DEFAULT NULL; -- JSON array e.g. ["Pitcher","Catcher"]
