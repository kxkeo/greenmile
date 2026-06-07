-- Migration 017: add positions to camp_registrations
ALTER TABLE camp_registrations ADD COLUMN positions TEXT DEFAULT NULL;
