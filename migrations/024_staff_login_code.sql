-- Staff login code: 2-letter initials + 4-digit number (e.g. "KK0099").
-- Unique per user, nullable (admins/gameday/readonly don't need one).
ALTER TABLE users ADD COLUMN login_code TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_login_code ON users(login_code) WHERE login_code IS NOT NULL;
