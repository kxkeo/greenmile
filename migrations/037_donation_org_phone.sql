-- Donor/sponsor company (or organization) name and phone number, collected at
-- donate checkout. Previously these were folded into the free-text notes field;
-- real columns make them usable in the CRM and exports.
--
-- The donations endpoint checks which columns exist (PRAGMA table_info) and
-- falls back to notes until this migration is applied, so applying it is safe
-- at any time and nothing breaks in the meantime.

ALTER TABLE donations ADD COLUMN organization TEXT DEFAULT NULL;
ALTER TABLE donations ADD COLUMN phone        TEXT DEFAULT NULL;
