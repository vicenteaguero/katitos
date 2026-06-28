-- ════════════════════════════════════════════════════════════════════════
-- Katitos — Türkiye lira (TRY) + per-member preferred currency
--   • TRY baseline rates: full directed pairs with USD/CLP/RUB/GEL so the
--     converter works on prod immediately (edge fn overwrites with live FX).
--     Baseline ≈ 1 USD = 38 TRY.
--   • couple_members.preferred_currency: the currency each person prefers to
--     read amounts in (so when we're in each country we default to it).
-- ════════════════════════════════════════════════════════════════════════

insert into public.currency_rates (base, quote, rate) values
  ('USD', 'TRY', 38),           ('TRY', 'USD', 0.02631579),
  ('CLP', 'TRY', 0.04),         ('TRY', 'CLP', 25),
  ('RUB', 'TRY', 0.42222222),   ('TRY', 'RUB', 2.36842105),
  ('GEL', 'TRY', 14.0740741),   ('TRY', 'GEL', 0.07105263)
on conflict (base, quote) do nothing;

alter table public.couple_members
  add column if not exists preferred_currency text;
