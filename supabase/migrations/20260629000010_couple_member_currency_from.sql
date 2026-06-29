-- Settings now lets each of us set a default converter PAIR (from → to). The
-- `to` side reuses the existing couple_members.preferred_currency; this adds the
-- `from` side. Nullable — the converter falls back to its built-in default.
alter table public.couple_members
  add column if not exists currency_from text;
