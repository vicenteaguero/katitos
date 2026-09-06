-- ════════════════════════════════════════════════════════════════════════
-- Katitos - the sweet nothings move into the database
--
--   They used to be a hardcoded array inside the Home component, and some of
--   them were feminine-only ('Liubimonkeykaya', 'любиминки') sitting in the
--   shared pool - so she kept sending him phrases addressed to a woman.
--
--   `gender` here is the gender of the RECIPIENT a phrase is valid for:
--     'f'   → only ever sent TO her
--     'm'   → only ever sent TO him
--     'any' → fine either way
--   `{name}` in the text is replaced with the recipient's pet name.
--
--   Only the admin (Vicente) may add or edit. She receives them; he writes
--   them. That's the point.
-- ════════════════════════════════════════════════════════════════════════

create table if not exists public.love_phrases (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  gender text not null default 'any' check (gender in ('m', 'f', 'any')),
  -- Higher = shows up more often. 1 is plenty for almost everything.
  weight int not null default 1 check (weight between 1 and 10),
  enabled boolean not null default true,
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists love_phrases_updated_at on public.love_phrases;
create trigger love_phrases_updated_at before update on public.love_phrases
  for each row execute function public.set_updated_at();

alter table public.love_phrases enable row level security;

drop policy if exists love_phrases_select on public.love_phrases;
drop policy if exists love_phrases_write  on public.love_phrases;

-- Both of us read them (they have to be sendable by both).
create policy love_phrases_select on public.love_phrases for select
  using (public.is_member());
-- Only the admin writes them.
create policy love_phrases_write on public.love_phrases for all
  using (public.is_admin()) with check (public.is_admin());

alter table public.love_phrases replica identity full;
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public'
      and tablename = 'love_phrases'
  ) then
    alter publication supabase_realtime add table public.love_phrases;
  end if;
end $$;

-- ── the pool ───────────────────────────────────────────────────────────────
-- Idempotent on the text, so re-running never duplicates a line.
insert into public.love_phrases (text, gender, weight, position)
select v.text, v.gender, v.weight, v.position
from (values
  -- ── ours, in whatever language they happened in ──
  ('Liubimonkey 🐵❤️',                    'any', 3, 0),
  ('Liubimonkeykaya 🥰',                  'f',   2, 1),
  ('Liubimonkeykayita 💞',                'f',   2, 2),
  ('любиминки 🤍',                        'f',   2, 3),
  ('любимая 🤍',                          'f',   2, 4),
  ('любимый 🤍',                          'm',   2, 5),
  ('My sunshine ☀️',                      'any', 3, 6),
  ('My Katito 🤎',                        'm',   3, 7),
  ('My Katita 🤍',                        'f',   3, 8),
  ('Katitos forever 🐻‍❄️🧉',                'any', 3, 9),
  ('Cutetitos 🥺',                        'any', 3, 10),
  ('My polar bear 🐻‍❄️',                   'f',   3, 11),
  ('Panda misses you too 🧸',             'any', 2, 12),
  ('Mi polola bonita ❤️',                 'f',   2, 13),
  ('Mi pololo bonito ❤️',                 'm',   2, 14),
  ('{name} hermosa 🌹',                   'f',   1, 15),
  ('{name} hermoso 🌹',                   'm',   1, 16),
  ('{name} preciosa ✨',                  'f',   1, 17),
  ('{name} precioso ✨',                  'm',   1, 18),
  -- ── the things we always say ──
  ('One day we get married 💍',           'any', 2, 19),
  ('Together even as robots ⚙️🤖',        'any', 2, 20),
  ('Robots with mechanic tulas, remember 🤖😂', 'any', 1, 21),
  ('Our whole life, all of it 🤍',        'any', 2, 22),
  -- ── the song ──
  ('Katito Katito my wonderful Katito 🎶', 'm',   2, 23),
  ('Katita Katita my wonderful Katita 🎶', 'f',   2, 24),
  ('Tuturututu tu tu tu… 🎵',             'any', 1, 25),
  ('…Tuturu tutu tu tu tu 🎶',            'any', 1, 26),
  -- ── plain and true ──
  ('I love you, {name} 💕',               'any', 3, 27),
  ('You''re the love of my life 💖',      'any', 2, 28),
  ('Thinking of you 💭',                  'any', 2, 29),
  ('Miss you across the miles 🌍',        'any', 2, 30),
  ('Counting down to you 📆',             'any', 2, 31),
  ('Close even when you''re far 🩵',      'any', 2, 32),
  ('I love you more every day 💞',        'any', 2, 33),
  ('Sending you a kiss 😘',               'any', 2, 34),
  ('You''re my home, {name} 🏡',          'any', 2, 35),
  ('{name}, you''re my everything 🌟',    'any', 2, 36)
) as v(text, gender, weight, position)
where not exists (
  select 1 from public.love_phrases p where p.text = v.text
);
