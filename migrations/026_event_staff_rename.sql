-- Migration 026: rename the code-login "staff" role → "event_staff"
-- Frees up the "staff" value for a new email+password role that has broader
-- admin access (campaigns, registrations, shop, donations, player credits,
-- user accounts — but not dev tools, settings, or admin user management).

UPDATE users SET role = 'event_staff' WHERE role = 'staff';
