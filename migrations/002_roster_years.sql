-- Add class and roster year to players
ALTER TABLE players ADD COLUMN class_year TEXT DEFAULT '';
ALTER TABLE players ADD COLUMN roster_year INTEGER DEFAULT 0;

-- Roster years table
CREATE TABLE IF NOT EXISTS roster_years (
  year INTEGER PRIMARY KEY,
  label TEXT NOT NULL,        -- e.g. "2025-26 Season"
  is_active INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Seed current year from existing players (treat all as 2025)
UPDATE players SET roster_year = 2025 WHERE roster_year = 0;

-- Create initial year entry
INSERT OR IGNORE INTO roster_years (year, label, is_active) VALUES (2025, '2025-26 Season', 1);
