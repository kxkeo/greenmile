-- 2026 Emperor Football Team Dinners.
-- Parents host a team dinner the Thursday evening before each Friday game.
-- Pre-filled hosting families from the printed sign-up flyer are seeded as
-- 'booked'; open dates are bookable online by a logged-in parent. The bye week
-- is a non-bookable placeholder row so the calendar reads correctly.

CREATE TABLE IF NOT EXISTS team_dinners (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  dinner_date    TEXT NOT NULL,              -- Thursday, e.g. '2026-08-20'
  game_date      TEXT,                       -- Friday game, e.g. '2026-08-21'
  opponent       TEXT,                       -- opponent school (NULL on bye)
  is_bye         INTEGER NOT NULL DEFAULT 0, -- 1 = bye week, not bookable
  status         TEXT NOT NULL DEFAULT 'open', -- 'open' | 'booked'
  host_names     TEXT,                       -- family/host names
  host_location  TEXT,                       -- e.g. "Anabel's house"
  participant_id INTEGER,                    -- set when booked online
  host_email     TEXT,
  host_phone     TEXT,
  bring_food     INTEGER NOT NULL DEFAULT 0,
  bring_drinks   INTEGER NOT NULL DEFAULT 0,
  bring_desserts INTEGER NOT NULL DEFAULT 0,
  notes          TEXT,
  created_at     TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  booked_at      TEXT
);

CREATE INDEX IF NOT EXISTS idx_team_dinners_date ON team_dinners (dinner_date);

-- Seed the 2026 schedule (idempotent on dinner_date).
INSERT INTO team_dinners (dinner_date, game_date, opponent, is_bye, status, host_names, host_location)
SELECT * FROM (
  SELECT '2026-08-20' AS dinner_date, '2026-08-21' AS game_date, 'Redwood'         AS opponent, 0 AS is_bye, 'booked' AS status, 'Anabel, Patty & Brenda'      AS host_names, 'Anabel''s house'      AS host_location UNION ALL
  SELECT '2026-08-27', '2026-08-28', 'Reedley',         0, 'booked', 'Anabel, Patty & Brenda',      'Anabel''s house' UNION ALL
  SELECT '2026-09-03', '2026-09-04', 'Sunnyside',       0, 'booked', 'Adela, Maria, Lydia, Corrine', 'Maria''s house' UNION ALL
  SELECT '2026-09-10', '2026-09-11', 'Golden West',     0, 'booked', 'Monica',                      'Monica''s house' UNION ALL
  SELECT '2026-09-17', '2026-09-18', 'Porterville',     0, 'booked', 'Laura Guzman & Ana Orozco',   'Ana Orozco''s house' UNION ALL
  SELECT '2026-09-25', NULL,         NULL,              1, 'open',   NULL,                          NULL UNION ALL
  SELECT '2026-10-01', '2026-10-02', 'Exeter',          0, 'booked', 'Soltero & Montejano',         NULL UNION ALL
  SELECT '2026-10-08', '2026-10-09', 'Immanuel',        0, 'booked', 'Johanna, Lucy & Angelica',    NULL UNION ALL
  SELECT '2026-10-15', '2026-10-16', 'Kerman',          0, 'booked', 'Solorio family',              NULL UNION ALL
  SELECT '2026-10-22', '2026-10-23', 'Washington Union',0, 'booked', 'Celaya family',               NULL UNION ALL
  SELECT '2026-10-29', '2026-10-30', 'Kingsburg',       0, 'open',   NULL,                          NULL
) AS seed
WHERE NOT EXISTS (SELECT 1 FROM team_dinners td WHERE td.dinner_date = seed.dinner_date);
