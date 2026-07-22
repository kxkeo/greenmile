-- Country Nights 2026 — booster fundraiser dinner + raffle.
-- Two campaigns: $50 admission (dinner/auction) and $100 raffle capped at 200
-- tickets via meta.max_tickets (enforced in /api/registrations/event).

INSERT INTO campaigns (type, title, description, status, event_date, event_time, location, price_cents, meta)
SELECT 'dinner',
       'Country Nights',
       'The Green Mile Boosters'' biggest night of the year — tri-tip dinner, silent & live auction, and country fun to back Emperor football. Doors open at 5:30 PM, dinner served at 6:00.',
       'active',
       '2026-09-26',
       '5:30 PM',
       '40481 Road 80, Dinuba, CA 93618',
       5000,
       '{"slug":"country-nights","kind":"ticket","doors":"5:30 PM","dinner":"6:00 PM","highlights":["Tri-Tip Dinner","Silent & Live Auction","Country Nights on the Green Mile"]}'
WHERE NOT EXISTS (SELECT 1 FROM campaigns WHERE title = 'Country Nights');

INSERT INTO campaigns (type, title, description, status, event_date, event_time, location, price_cents, meta)
SELECT 'fundraiser',
       'Country Nights Raffle',
       'Only 200 tickets sold — Grand Prize $5,000, 2nd Prize $600, 3rd Prize $400. Drawing at Country Nights on September 26, 2026. Need not be present to win.',
       'active',
       '2026-09-26',
       NULL,
       '40481 Road 80, Dinuba, CA 93618',
       10000,
       '{"slug":"country-nights-raffle","kind":"raffle","max_tickets":200,"prizes":[{"label":"Grand Prize","amount":500000},{"label":"2nd Prize","amount":60000},{"label":"3rd Prize","amount":40000}],"need_not_be_present":true}'
WHERE NOT EXISTS (SELECT 1 FROM campaigns WHERE title = 'Country Nights Raffle');
