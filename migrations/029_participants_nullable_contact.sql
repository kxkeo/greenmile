-- Allow email-only OR phone-only participant accounts.
-- The original 001 schema declared both email and phone NOT NULL, but signup
-- supports providing just one. Rebuild the table with both nullable.
-- (Safe rebuild: run while participants is empty.)

DROP TABLE IF EXISTS participants;

CREATE TABLE participants (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT    UNIQUE COLLATE NOCASE,        -- nullable (phone-only accounts)
  pin_hash      TEXT    NOT NULL,                     -- PBKDF2 of password or PIN
  first_name    TEXT    NOT NULL DEFAULT '',
  last_name     TEXT    NOT NULL DEFAULT '',
  phone         TEXT    DEFAULT NULL,                 -- nullable (email-only accounts)
  newsletter    INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  last_login_at TEXT    DEFAULT NULL,
  address       TEXT    DEFAULT NULL,
  city          TEXT    DEFAULT NULL,
  state         TEXT    DEFAULT NULL,
  zip           TEXT    DEFAULT NULL,
  disabled      INTEGER NOT NULL DEFAULT 0,
  sms_opt_out   INTEGER NOT NULL DEFAULT 0
);
