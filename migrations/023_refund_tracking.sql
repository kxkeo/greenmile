-- Migration 023: add refund tracking columns to all paid-entity tables
-- Admin refund flow stores the Stripe refund id + refunded amount + timestamp
-- on whichever row was refunded. payment_status becomes 'refunded' which is
-- treated as the canceled-but-kept signal (row stays for records).

ALTER TABLE event_registrations ADD COLUMN refund_id TEXT;
ALTER TABLE event_registrations ADD COLUMN refund_amount_cents INTEGER;
ALTER TABLE event_registrations ADD COLUMN refunded_at TEXT;

ALTER TABLE camp_registrations ADD COLUMN refund_id TEXT;
ALTER TABLE camp_registrations ADD COLUMN refund_amount_cents INTEGER;
ALTER TABLE camp_registrations ADD COLUMN refunded_at TEXT;

ALTER TABLE golf_registrations ADD COLUMN refund_id TEXT;
ALTER TABLE golf_registrations ADD COLUMN refund_amount_cents INTEGER;
ALTER TABLE golf_registrations ADD COLUMN refunded_at TEXT;

ALTER TABLE donations ADD COLUMN refund_id TEXT;
ALTER TABLE donations ADD COLUMN refund_amount_cents INTEGER;
ALTER TABLE donations ADD COLUMN refunded_at TEXT;
