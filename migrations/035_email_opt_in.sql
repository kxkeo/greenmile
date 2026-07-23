-- Marketing/email consent for the CRM. Country Nights (and other event)
-- registrants, donors, and sponsors can opt in to future Green Mile Boosters
-- promos and event announcements.

ALTER TABLE event_registrations ADD COLUMN email_opt_in INTEGER NOT NULL DEFAULT 0;
ALTER TABLE donations ADD COLUMN email_opt_in INTEGER NOT NULL DEFAULT 0;
