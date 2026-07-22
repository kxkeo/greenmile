-- Team dinners: hosting a dinner means providing food, drinks, AND desserts
-- (no longer a pick-list), and hosts can record a street address. Add the
-- address column and mark existing booked dinners as providing all three.

ALTER TABLE team_dinners ADD COLUMN address TEXT;

UPDATE team_dinners
   SET bring_food = 1, bring_drinks = 1, bring_desserts = 1
 WHERE status = 'booked';
