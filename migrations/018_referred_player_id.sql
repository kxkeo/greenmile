-- Migration 018: add referred_player_id (FK to players) on all referral tables
ALTER TABLE camp_registrations  ADD COLUMN referred_player_id INTEGER DEFAULT NULL REFERENCES players(id);
ALTER TABLE golf_registrations  ADD COLUMN referred_player_id INTEGER DEFAULT NULL REFERENCES players(id);
ALTER TABLE event_registrations ADD COLUMN referred_player_id INTEGER DEFAULT NULL REFERENCES players(id);
ALTER TABLE donations           ADD COLUMN referred_player_id INTEGER DEFAULT NULL REFERENCES players(id);
