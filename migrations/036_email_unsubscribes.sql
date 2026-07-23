-- Email opt-outs. Any address here is excluded from promo/marketing sends
-- (CAN-SPAM). Populated by the one-click unsubscribe link in promo emails.

CREATE TABLE IF NOT EXISTS email_unsubscribes (
  email      TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  source     TEXT
);
