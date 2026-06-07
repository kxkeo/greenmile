-- Migration 028: SMS delivery (Twilio)

-- Per-participant SMS preference. Default 0 (opted-in) so phone-only signups
-- can receive their PIN. Users can flip this from My Account → Settings.
-- Security-critical messages (PIN reset) still fire regardless of this flag.
ALTER TABLE participants ADD COLUMN sms_opt_out INTEGER NOT NULL DEFAULT 0;

-- Audit trail of every SMS we attempted to send. Paired with sendSms() in
-- functions/_lib/sms.js, which writes a row whether the send succeeds,
-- fails, is invalid, or is blocked by opt-out.
CREATE TABLE IF NOT EXISTS sms_log (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  participant_id INTEGER,               -- nullable for forgot-pin attempts
                                        -- that don't match an account
  to_phone       TEXT,                  -- E.164 (+1XXXXXXXXXX)
  purpose        TEXT,                  -- 'pin_new', 'pin_reset', 'forgot_pin',
                                        -- 'registration', 'reminder', 'other'
  status         TEXT NOT NULL,         -- 'sent' | 'failed' | 'invalid' |
                                        -- 'opted_out' | 'not_configured'
  provider_sid   TEXT,                  -- Twilio Message SID on success
  error          TEXT,                  -- Twilio error message on failure
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sms_log_created     ON sms_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sms_log_participant ON sms_log(participant_id);
CREATE INDEX IF NOT EXISTS idx_sms_log_purpose     ON sms_log(purpose);
