-- Add role column: admin | staff | gameday | readonly
ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'staff';
UPDATE users SET role = 'admin' WHERE is_admin = 1;

-- Track last login timestamp
ALTER TABLE users ADD COLUMN last_login_at TEXT;
