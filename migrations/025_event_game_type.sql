-- Migration 025: add game_type to event_registrations
-- Alumni Game attendees pick either "baseball" or "softball" so the staff
-- can split rosters between the two games on event day.

ALTER TABLE event_registrations ADD COLUMN game_type TEXT DEFAULT NULL;
