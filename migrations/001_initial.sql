-- Users / accounts
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  is_admin INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Seed built-in admin (password: letmein — sha256 hashed client-side, stored as hex)
-- We'll handle admin specially in auth, but keep a record
INSERT OR IGNORE INTO users (first_name, last_name, email, password_hash, is_admin)
VALUES ('Admin', 'DHRC', 'admin', 'letmein_builtin', 1);

-- Home roster
CREATE TABLE IF NOT EXISTS players (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  number TEXT NOT NULL,
  positions TEXT DEFAULT '[]',
  song_name TEXT DEFAULT '',
  song_artist TEXT DEFAULT '',
  spotify_url TEXT DEFAULT '',
  spotify_uri TEXT DEFAULT '',
  start_time TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now'))
);

-- Away teams
CREATE TABLE IF NOT EXISTS away_teams (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  city TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Away players (belong to a team)
CREATE TABLE IF NOT EXISTS away_players (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  team_id INTEGER NOT NULL REFERENCES away_teams(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  number TEXT NOT NULL,
  positions TEXT DEFAULT '[]',
  created_at TEXT DEFAULT (datetime('now'))
);

-- Anthem (single row, upserted)
CREATE TABLE IF NOT EXISTS anthem (
  id INTEGER PRIMARY KEY DEFAULT 1,
  name TEXT DEFAULT '',
  artist TEXT DEFAULT '',
  spotify_url TEXT DEFAULT '',
  spotify_uri TEXT DEFAULT '',
  start_time TEXT DEFAULT ''
);
INSERT OR IGNORE INTO anthem (id) VALUES (1);

-- Intermission playlist
CREATE TABLE IF NOT EXISTS intermission_tracks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  artist TEXT DEFAULT '',
  spotify_url TEXT DEFAULT '',
  spotify_uri TEXT DEFAULT '',
  start_time TEXT DEFAULT '',
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Lineup (9 fixed slots, persist all season)
CREATE TABLE IF NOT EXISTS lineup_slots (
  slot_index INTEGER PRIMARY KEY,  -- 0-8
  player_id INTEGER REFERENCES players(id) ON DELETE SET NULL,
  batting_position TEXT DEFAULT '',
  dh_defender_id INTEGER REFERENCES players(id) ON DELETE SET NULL,
  dh_defender_position TEXT DEFAULT ''
);
-- Seed 9 empty slots
INSERT OR IGNORE INTO lineup_slots (slot_index) VALUES (0),(1),(2),(3),(4),(5),(6),(7),(8);
