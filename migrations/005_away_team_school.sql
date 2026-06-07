ALTER TABLE away_teams ADD COLUMN school TEXT DEFAULT '';
-- Backfill: set school = city + ' ' + name for existing teams
UPDATE away_teams SET school = city || ' ' || name WHERE school = '';
