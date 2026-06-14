-- ════════════════════════════════════════════════════════════════════════
-- Katitos — baseline currency rates (prod-safe seed)
--   seed.sql never runs on prod, the currency-rates edge function is not on a
--   schedule, and the app has no self-heal — so currency_rates was EMPTY on
--   prod and every conversion (and the Home widget) showed "—". This migration
--   runs on prod (via `make db-push`) and gives the converter a working
--   baseline, including GEL — the Georgia-trip currency, which was missing
--   everywhere, even on a fresh local DB.
--   Full directed matrix for USD/CLP/RUB/GEL so every direct lookup hits
--   without relying on USD triangulation. Rates are approximate; the
--   currency-rates edge function overwrites them with live FX when run.
--   `on conflict do nothing` preserves any fresher rows already present.
-- ════════════════════════════════════════════════════════════════════════
insert into public.currency_rates (base, quote, rate) values
  -- from USD
  ('USD', 'CLP', 950),         ('USD', 'RUB', 90),          ('USD', 'GEL', 2.7),
  -- from CLP
  ('CLP', 'USD', 0.00105263),  ('CLP', 'RUB', 0.09473684),  ('CLP', 'GEL', 0.00284211),
  -- from RUB
  ('RUB', 'USD', 0.01111111),  ('RUB', 'CLP', 10.5555556),  ('RUB', 'GEL', 0.03),
  -- from GEL
  ('GEL', 'USD', 0.37037037),  ('GEL', 'CLP', 351.851852),  ('GEL', 'RUB', 33.3333333)
on conflict (base, quote) do nothing;
