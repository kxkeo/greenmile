-- Unified events table (replaces hardcoded schedule)
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL DEFAULT 'game',       -- game | camp | tournament | other
  title TEXT NOT NULL,                     -- opponent name for games, event name for others
  date TEXT NOT NULL,                      -- YYYY-MM-DD
  end_date TEXT DEFAULT '',                -- YYYY-MM-DD for multi-day events
  time TEXT DEFAULT '',                    -- display time string e.g. "3:30/6:00"
  site TEXT DEFAULT '',
  level TEXT DEFAULT '',                   -- JV/V, V, JV, etc.
  home INTEGER DEFAULT 0,                  -- 1=home, 0=away (games only)
  notes TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now'))
);

-- Seed the 2026 schedule from hardcoded data
INSERT INTO events (type, title, date, time, site, level, home) VALUES
('game','Woodlake (Scrimmage)','2026-02-18','3:30/3:30','Woodlake','JV/V',0),
('game','Kerman (CVDC)','2026-02-21','10:00/1:00','Dinuba','JV/V',1),
('game','Fowler (CVDC)','2026-02-24','3:00/6:00','Dinuba','JV/V',1),
('game','Sanger West (CVDC)','2026-02-28','3:00/3:00','Sanger West','JV/V',0),
('game','Pioneer Valley','2026-03-03','3:38','Pioneer Valley','V',0),
('game','Reedley (CVDC)','2026-03-05','3:00/6:00','Reedley','JV/V',0),
('game','Golden West (CVDC)','2026-03-07','9:00/6:00','Dinuba','JV/V',1),
('game','Sierra','2026-03-13','3:30/3:30','Sierra','JV/V',0),
('game','(CVDC)','2026-03-14','TBD','Fowler','JV/V',0),
('game','Hanford','2026-03-18','4:30/4:30','Hanford','JV/V',0),
('game','Hanford','2026-03-20','3:00/6:00','Dinuba','JV/V',1),
('game','Tulare Western','2026-03-25','3:00/6:00','Dinuba','JV/V',1),
('game','Tulare Western','2026-03-27','4:30/4:30','Tulare Western','JV/V',0),
('game','Fowler Easter Classic','2026-03-28','TBA','Fowler','JV/V',0),
('game','Lemoore','2026-04-08','3:00/6:00','Dinuba','JV/V',1),
('game','Lemoore','2026-04-10','4:30/4:30','Lemoore','JV/V',0),
('game','Tulare Union','2026-04-15','4:30/7:00','Live Oak Park','JV/V',0),
('game','Tulare Union','2026-04-17','3:00/6:00','Dinuba','JV/V',1),
('game','Mission Oak','2026-04-22','4:30/4:30','Mission Oak','JV/V',0),
('game','Mission Oak','2026-04-24','3:00/6:00','Dinuba','JV/V',1),
('game','Hanford','2026-04-29','3:00/6:00','Dinuba','JV/V',1),
('game','Tulare Western','2026-05-01','4:30/4:30','Tulare Western','JV/V',0),
('game','Lemoore','2026-05-06','4:30/4:30','Lemoore','JV/V',0),
('game','Tulare Union','2026-05-08','3:00/6:00','Dinuba','JV/V',1),
('game','Mission Oak (Senior Night)','2026-05-12','3:00/6:00','Dinuba','JV/V',1);
