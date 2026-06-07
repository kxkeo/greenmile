-- ============================================================
-- Migration 016: referred_by on all registration tables
--                shirt_made / shirt_assigned on camp + event registrations
-- ============================================================

-- Camp registrations
ALTER TABLE camp_registrations ADD COLUMN referred_by    TEXT    DEFAULT NULL;
ALTER TABLE camp_registrations ADD COLUMN shirt_made     INTEGER NOT NULL DEFAULT 0;
ALTER TABLE camp_registrations ADD COLUMN shirt_assigned INTEGER NOT NULL DEFAULT 0;

-- Golf registrations
ALTER TABLE golf_registrations ADD COLUMN referred_by TEXT DEFAULT NULL;

-- Event registrations (alumni, fundraiser, other)
ALTER TABLE event_registrations ADD COLUMN referred_by    TEXT    DEFAULT NULL;
ALTER TABLE event_registrations ADD COLUMN shirt_made     INTEGER NOT NULL DEFAULT 0;
ALTER TABLE event_registrations ADD COLUMN shirt_assigned INTEGER NOT NULL DEFAULT 0;

-- Donations
ALTER TABLE donations ADD COLUMN referred_by    TEXT    DEFAULT NULL;
ALTER TABLE donations ADD COLUMN participant_id INTEGER DEFAULT NULL REFERENCES participants(id);
