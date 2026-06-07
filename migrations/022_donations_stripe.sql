-- Migration 022: add Stripe payment intent tracking to donations
-- Lets us record the PI id after a successful Stripe card donation for audit / refund lookup.

ALTER TABLE donations ADD COLUMN stripe_payment_intent TEXT DEFAULT NULL;
