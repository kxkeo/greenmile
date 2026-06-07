-- ============================================================
-- Migration 006: Participants, event registrations,
--                golf scoring, and hall of fame
-- ============================================================
-- All decisions confirmed:
--
-- GOLF
--   • Format: Scramble — one final gross score per team
--   • Par: admin sets total par per tournament year
--   • Contests: longest drive (men + women), hole-in-one,
--               closest to pin (one hole, admin sets it),
--               50/50 raffle, on the green raffle
--   • Leaderboard: admin publish switch
--   • Scores entered by: scorer volunteers (separate login)
--   • Team member PINs: sent only after primary registrant pays
--
-- HALL OF FAME
--   • Tournament champions by year
--   • Longest drive records
--   • Top fundraising sponsor (by dollar amount)
--   • Sponsor recognition wall (all-time)
--
-- CAMP
--   • Single day event
--   • Parent = account holder; child info on registration row
--   • Tracks: check-in, age/skill, shirt size, emergency contact, waiver
--
-- PARTICIPANT ACCOUNTS
--   • One login (email + 6-digit PIN) across golf AND camp, all years
--   • PIN permanent until reset requested
--   • Portal: registration summary, team edit, add-ons,
--             own score, leaderboard, receipt
--   • Newsletter opt-in at registration (default off)
--
-- SCORING VOLUNTEERS
--   • Separate scorer_accounts table
--   • Scorers can only write scores; no Events Management access
-- ============================================================


-- ── 1. PARTICIPANTS ──────────────────────────────────────────────────────────
-- One record per unique email. Works across golf + camp, all years.

CREATE TABLE IF NOT EXISTS participants (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT    NOT NULL UNIQUE COLLATE NOCASE,
  pin_hash      TEXT    NOT NULL,            -- SHA-256 of 6-digit PIN
  first_name    TEXT    NOT NULL DEFAULT '',
  last_name     TEXT    NOT NULL DEFAULT '',
  phone         TEXT    NOT NULL DEFAULT '',
  newsletter    INTEGER NOT NULL DEFAULT 0,  -- 1 = opted into newsletter
  created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  last_login_at TEXT    DEFAULT NULL
);


-- ── 2. PARTICIPANT SESSIONS ──────────────────────────────────────────────────
-- 7-day tokens stored in D1. Separate from admin KV sessions.

CREATE TABLE IF NOT EXISTS participant_sessions (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  participant_id INTEGER NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  token          TEXT    NOT NULL UNIQUE,     -- random 64-char hex
  expires_at     TEXT    NOT NULL,
  created_at     TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_psess_token       ON participant_sessions(token);
CREATE INDEX IF NOT EXISTS idx_psess_participant ON participant_sessions(participant_id);


-- ── 3. SCORING VOLUNTEERS ────────────────────────────────────────────────────
-- Admin creates these before tournament day. Scorers get username + PIN.
-- event_id = NULL means the account works for any event (reusable volunteer).
-- Deactivate after tournament by setting active = 0.

CREATE TABLE IF NOT EXISTS scorer_accounts (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT    NOT NULL,               -- e.g. "John Smith - Volunteer"
  username    TEXT    NOT NULL UNIQUE COLLATE NOCASE,
  pin_hash    TEXT    NOT NULL,
  event_id    INTEGER DEFAULT NULL REFERENCES events(id),
  active      INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);


-- ── 4. GOLF TOURNAMENT META ──────────────────────────────────────────────────
-- One row per tournament year. Controls scoring + leaderboard visibility.
-- closest_to_pin_hole: the single designated hole for CTP contest each year.

CREATE TABLE IF NOT EXISTS golf_tournament_meta (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id             INTEGER NOT NULL UNIQUE REFERENCES events(id) ON DELETE CASCADE,
  year                 INTEGER NOT NULL,
  course_name          TEXT    NOT NULL DEFAULT 'Ridge Creek Dinuba Golf Club',
  course_par           INTEGER NOT NULL DEFAULT 72,
  shotgun_time         TEXT    DEFAULT '',
  closest_to_pin_hole  INTEGER DEFAULT NULL,  -- hole number, set by admin
  scoring_open         INTEGER NOT NULL DEFAULT 0,  -- 1 = scorers can enter
  results_published    INTEGER NOT NULL DEFAULT 0,  -- 1 = public can see leaderboard
  notes                TEXT    DEFAULT ''
);


-- ── 5. GOLF REGISTRATIONS ────────────────────────────────────────────────────
-- One row per registration transaction per participant per event.
-- addons: JSON e.g. { "mulligan": 2, "raffle5050": 1, "longdrive": 1 }
-- total_cents: avoids float issues. $125.00 = 12500.

CREATE TABLE IF NOT EXISTS golf_registrations (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id       INTEGER NOT NULL REFERENCES events(id),
  participant_id INTEGER NOT NULL REFERENCES participants(id),
  sponsor        TEXT    DEFAULT NULL,   -- 'tee'|'green'|'silver'|'emperor'
  entry_type     TEXT    DEFAULT NULL,   -- 'individual'|'group'
  addons         TEXT    NOT NULL DEFAULT '{}',
  total_cents    INTEGER NOT NULL DEFAULT 0,
  payment_status TEXT    NOT NULL DEFAULT 'pending', -- 'pending'|'paid'|'refunded'
  stripe_session TEXT    DEFAULT NULL,
  notes          TEXT    DEFAULT '',
  created_at     TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_golf_reg_event       ON golf_registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_golf_reg_participant ON golf_registrations(participant_id);


-- ── 6. GOLF TEAM MEMBERS ─────────────────────────────────────────────────────
-- Slot 1 = primary registrant. Slots 2–4 = group teammates.
-- participant_id NULL until teammate creates/claims their account.
-- pin_sent: only flips to 1 AFTER registration payment_status = 'paid'.

CREATE TABLE IF NOT EXISTS golf_team_members (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  registration_id INTEGER NOT NULL REFERENCES golf_registrations(id) ON DELETE CASCADE,
  slot            INTEGER NOT NULL DEFAULT 1,
  name            TEXT    NOT NULL DEFAULT '',
  email           TEXT    DEFAULT NULL,
  phone           TEXT    DEFAULT NULL,
  participant_id  INTEGER DEFAULT NULL REFERENCES participants(id),
  pin_sent        INTEGER NOT NULL DEFAULT 0,
  pin_sent_at     TEXT    DEFAULT NULL,
  created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_golf_members_reg         ON golf_team_members(registration_id);
CREATE INDEX IF NOT EXISTS idx_golf_members_participant ON golf_team_members(participant_id);


-- ── 7. GOLF TEAMS ────────────────────────────────────────────────────────────
-- One team per registration. The scoring unit.
-- Individual entry = 1-person team. Group = up to 4.
-- tee_assignment = starting hole for shotgun start e.g. "Hole 7A".

CREATE TABLE IF NOT EXISTS golf_teams (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id        INTEGER NOT NULL REFERENCES events(id),
  registration_id INTEGER NOT NULL UNIQUE REFERENCES golf_registrations(id),
  team_name       TEXT    DEFAULT NULL,
  tee_assignment  TEXT    DEFAULT NULL,
  created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_golf_teams_event ON golf_teams(event_id);


-- ── 8. GOLF SCORES ───────────────────────────────────────────────────────────
-- One row per team per tournament.
-- score_to_par stored (not computed) for D1 compatibility.
-- Scorer can only write when golf_tournament_meta.scoring_open = 1.
-- Admin sets place before flipping results_published.

CREATE TABLE IF NOT EXISTS golf_scores (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id      INTEGER NOT NULL REFERENCES events(id),
  team_id       INTEGER NOT NULL REFERENCES golf_teams(id),
  gross_score   INTEGER DEFAULT NULL,
  score_to_par  INTEGER DEFAULT NULL,  -- stored: gross_score - course_par
  place         INTEGER DEFAULT NULL,  -- admin-assigned before publishing
  entered_by    INTEGER DEFAULT NULL REFERENCES scorer_accounts(id),
  notes         TEXT    DEFAULT '',
  entered_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_golf_scores_unique ON golf_scores(event_id, team_id);
CREATE INDEX IF NOT EXISTS        idx_golf_scores_event  ON golf_scores(event_id);


-- ── 9. GOLF CONTEST RESULTS ──────────────────────────────────────────────────
-- One winner per contest type per tournament (unique index).
-- detail is context-specific per contest type (see comments below).

CREATE TABLE IF NOT EXISTS golf_contest_results (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id       INTEGER NOT NULL REFERENCES events(id),
  contest_type   TEXT    NOT NULL,
    -- 'longest_drive_men'   detail = distance yards e.g. "287"
    -- 'longest_drive_women' detail = distance yards
    -- 'hole_in_one'         detail = hole number; hole_number also set
    -- 'closest_to_pin'      detail = distance e.g. '4\'2"'; hole_number set
    -- 'raffle_5050'         detail = prize amount e.g. "$340"
    -- 'on_the_green'        detail = prize description
  winner_name    TEXT    NOT NULL DEFAULT '',
  winner_team    TEXT    DEFAULT NULL,
  participant_id INTEGER DEFAULT NULL REFERENCES participants(id),
  detail         TEXT    DEFAULT NULL,
  hole_number    INTEGER DEFAULT NULL,
  notes          TEXT    DEFAULT '',
  entered_by     INTEGER DEFAULT NULL REFERENCES scorer_accounts(id),
  created_at     TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_contest_event ON golf_contest_results(event_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_contest_unique ON golf_contest_results(event_id, contest_type);


-- ── 10. HALL OF FAME ─────────────────────────────────────────────────────────
-- Admin-curated only. Never auto-populated from scores/contests.
-- Admin manually promotes records here after each tournament.
-- display_order controls sort within category+year (lower = shown first).
--
-- category values:
--   'champion'      tournament winners; detail = score e.g. "-8 (64)"
--   'longest_drive' record distance;    detail = e.g. "312 yds"
--   'top_sponsor'   fundraising leader; detail = dollar amount raised
--   'sponsor_wall'  recognition listing; sponsor_level = tier

CREATE TABLE IF NOT EXISTS hall_of_fame (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  year           INTEGER NOT NULL,
  category       TEXT    NOT NULL,
  honoree_name   TEXT    NOT NULL,
  honoree_team   TEXT    DEFAULT NULL,
  participant_id INTEGER DEFAULT NULL REFERENCES participants(id),
  event_id       INTEGER DEFAULT NULL REFERENCES events(id),
  detail         TEXT    DEFAULT NULL,
  sponsor_level  TEXT    DEFAULT NULL,   -- 'tee'|'green'|'silver'|'emperor'
  display_order  INTEGER NOT NULL DEFAULT 0,
  created_at     TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_hof_year     ON hall_of_fame(year);
CREATE INDEX IF NOT EXISTS idx_hof_category ON hall_of_fame(category);


-- ── 11. CAMP META ────────────────────────────────────────────────────────────
-- One row per camp year. age_groups as JSON for year-to-year flexibility.

CREATE TABLE IF NOT EXISTS camp_meta (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id    INTEGER NOT NULL UNIQUE REFERENCES events(id) ON DELETE CASCADE,
  year        INTEGER NOT NULL,
  location    TEXT    NOT NULL DEFAULT 'DHS Baseball Field at Washington Intermediate School',
  age_groups  TEXT    NOT NULL DEFAULT '["6-8","9-11","12-14","15+"]',
  notes       TEXT    DEFAULT ''
);


-- ── 12. CAMP REGISTRATIONS ───────────────────────────────────────────────────
-- Parent = participant (account holder). Child info on this row.
-- Single-day event: one checked_in flag, no per-day tracking.
-- waiver_signed_at recorded for legal record-keeping.

CREATE TABLE IF NOT EXISTS camp_registrations (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id            INTEGER NOT NULL REFERENCES events(id),
  participant_id      INTEGER NOT NULL REFERENCES participants(id),
  -- Child / player
  player_first_name   TEXT    NOT NULL DEFAULT '',
  player_last_name    TEXT    NOT NULL DEFAULT '',
  player_dob          TEXT    DEFAULT NULL,        -- YYYY-MM-DD
  player_age_group    TEXT    DEFAULT NULL,        -- '6-8'|'9-11'|'12-14'|'15+'
  player_skill_level  TEXT    DEFAULT NULL,        -- 'beginner'|'intermediate'|'advanced'
  tshirt_size         TEXT    DEFAULT NULL,        -- 'YS'|'YM'|'YL'|'AS'|'AM'|'AL'|'AXL'
  -- Emergency contact
  emergency_name      TEXT    DEFAULT NULL,
  emergency_phone     TEXT    DEFAULT NULL,
  emergency_relation  TEXT    DEFAULT NULL,
  -- Waiver
  waiver_signed       INTEGER NOT NULL DEFAULT 0,
  waiver_signed_at    TEXT    DEFAULT NULL,
  -- Check-in
  checked_in          INTEGER NOT NULL DEFAULT 0,
  checked_in_at       TEXT    DEFAULT NULL,
  checked_in_by       TEXT    DEFAULT NULL,
  -- Payment
  total_cents         INTEGER NOT NULL DEFAULT 0,
  payment_status      TEXT    NOT NULL DEFAULT 'pending',
  stripe_session      TEXT    DEFAULT NULL,
  notes               TEXT    DEFAULT '',
  created_at          TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at          TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_camp_reg_event       ON camp_registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_camp_reg_participant ON camp_registrations(participant_id);


-- ── 13. EMAIL LOG ────────────────────────────────────────────────────────────
-- Full audit trail for every outbound email.
-- Prevents duplicate sends; debugging tool when wiring Mailgun/SendGrid.
--
-- email_type values:
--   'pin_welcome'        new account created, here is your PIN
--   'pin_reset'          participant requested PIN resend
--   'golf_confirmation'  golf registration confirmed (primary registrant)
--   'camp_confirmation'  camp registration confirmed
--   'team_invite'        team member PIN — sent only after payment confirmed
--   'newsletter'         general newsletter

CREATE TABLE IF NOT EXISTS email_log (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  participant_id INTEGER DEFAULT NULL REFERENCES participants(id),
  to_email       TEXT    NOT NULL,
  email_type     TEXT    NOT NULL,
  subject        TEXT    DEFAULT '',
  status         TEXT    NOT NULL DEFAULT 'queued',  -- 'queued'|'sent'|'failed'
  provider_id    TEXT    DEFAULT NULL,               -- Mailgun/SendGrid message ID
  error          TEXT    DEFAULT NULL,
  sent_at        TEXT    DEFAULT NULL,
  created_at     TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_email_log_participant ON email_log(participant_id);
CREATE INDEX IF NOT EXISTS idx_email_log_type        ON email_log(email_type);
CREATE INDEX IF NOT EXISTS idx_email_log_status      ON email_log(status);
