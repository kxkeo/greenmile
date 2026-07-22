-- Per-item detail for potluck donations: when a parent picks food/drinks/
-- dessert they can note exactly what they're bringing (e.g. "Tri-tip
-- sandwiches", "Water & Gatorade").

ALTER TABLE team_dinner_donations ADD COLUMN food_note TEXT;
ALTER TABLE team_dinner_donations ADD COLUMN drinks_note TEXT;
ALTER TABLE team_dinner_donations ADD COLUMN desserts_note TEXT;
