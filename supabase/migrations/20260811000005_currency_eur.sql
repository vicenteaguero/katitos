-- ════════════════════════════════════════════════════════════════════════
-- Katitos - the euro joins the bench
--
--   Baseline rates only. The client refreshes the whole matrix from one
--   keyless USD fetch whenever the rates are ≥8h old OR a pair is missing -
--   that second condition is new, and it is what makes adding a currency work
--   at all. Without it, EUR would have sat here as the seed values forever,
--   because every existing row was fresh and the refresh returned early.
--
--   `on conflict do nothing` so a real fetched rate is never overwritten by a
--   guess. Approximately 1 EUR = 1.08 USD at time of writing.
-- ════════════════════════════════════════════════════════════════════════

insert into public.currency_rates (base, quote, rate) values
  -- EUR out
  ('EUR', 'USD', 1.08),        ('EUR', 'CLP', 1026),
  ('EUR', 'RUB', 97.2),        ('EUR', 'GEL', 2.916),
  ('EUR', 'TRY', 41.04),
  -- EUR in
  ('USD', 'EUR', 0.92592593),  ('CLP', 'EUR', 0.00097466),
  ('RUB', 'EUR', 0.01028807),  ('GEL', 'EUR', 0.34293553),
  ('TRY', 'EUR', 0.02436647)
on conflict (base, quote) do nothing;
