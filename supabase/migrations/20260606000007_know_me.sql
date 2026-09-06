-- ════════════════════════════════════════════════════════════════════════
-- Katitos - Know-Me (the daily "how well do you know me" game)
-- ONE shared question per couple-day. Both partners answer about themselves
-- (truth) AND guess the other; reveal when both submit; score the guesses.
--
-- ANTI-PEEK: know_me_answers is NEVER in the realtime publication (Supabase
-- broadcasts whole rows, no column filtering). The live "partner submitted"
-- signal comes from know_me_presence (no choices). The partner's choices are
-- only ever read via know_me_reveal() (masked until both submit) and the
-- know_me_revealed view (both-submitted days only).
-- ════════════════════════════════════════════════════════════════════════

-- Question catalog. created_by NULLABLE (default kept): catalog rows seeded in
-- a migration get NULL; couple-authored ones get auth.uid() at runtime.
create table public.know_me_questions (
  id uuid primary key default gen_random_uuid(),
  prompt text not null,
  category text not null default 'general',
  options jsonb not null check (jsonb_array_length(options) = 4),
  is_custom boolean not null default false,
  active boolean not null default true,
  created_by uuid default auth.uid() references auth.users (id),
  created_at timestamptz not null default now()
);
create index know_me_questions_pick_idx
  on public.know_me_questions (active, is_custom, created_at);

-- One question assignment per couple-day.
create table public.know_me_days (
  id uuid primary key default gen_random_uuid(),
  couple_day date not null unique,
  question_id uuid not null references public.know_me_questions (id),
  created_at timestamptz not null default now()
);

-- The dual answer (own truth + guess of partner) + optional reaction selfie.
-- NOT published (see header).
create table public.know_me_answers (
  id uuid primary key default gen_random_uuid(),
  day_id uuid not null references public.know_me_days (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  own_choice text not null,
  guess_choice text not null,
  reaction_path text,
  submitted_at timestamptz not null default now(),
  unique (day_id, user_id)
);
create index know_me_answers_day_idx on public.know_me_answers (day_id);

-- Presence: the live "X submitted" signal. NO choice columns. Published.
create table public.know_me_presence (
  id uuid primary key default gen_random_uuid(),
  day_id uuid not null references public.know_me_days (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  submitted_at timestamptz not null default now(),
  unique (day_id, user_id)
);
create index know_me_presence_day_idx on public.know_me_presence (day_id);

-- RLS ----------------------------------------------------------------------
alter table public.know_me_questions enable row level security;
alter table public.know_me_days enable row level security;
alter table public.know_me_answers enable row level security;
alter table public.know_me_presence enable row level security;
create policy members_all on public.know_me_questions
  for all using (public.is_member()) with check (public.is_member());
create policy members_all on public.know_me_days
  for all using (public.is_member()) with check (public.is_member());
create policy members_all on public.know_me_answers
  for all using (public.is_member()) with check (public.is_member());
create policy members_all on public.know_me_presence
  for all using (public.is_member()) with check (public.is_member());

-- Realtime: presence + days ONLY. know_me_answers stays unpublished.
alter publication supabase_realtime add table public.know_me_presence;
alter publication supabase_realtime add table public.know_me_days;

-- Edit-lock trigger: once BOTH have submitted, reject changes to own/guess
-- (allow reaction_path). Prevents change-after-seeing-partner exploits.
create or replace function public.know_me_lock_after_reveal()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.own_choice is distinct from old.own_choice
      or new.guess_choice is distinct from old.guess_choice) then
    if (select count(*) from public.know_me_answers where day_id = new.day_id) = 2 then
      raise exception 'answers locked after reveal' using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;
create trigger know_me_lock before update on public.know_me_answers
  for each row execute function public.know_me_lock_after_reveal();

-- ── ensure_today: idempotent, race-safe daily assignment (no args) ─────────
create or replace function public.know_me_ensure_today()
returns public.know_me_days
language plpgsql
security definer
set search_path = public
as $$
declare
  v_day public.know_me_days;
  v_date date;
  v_qid uuid;
begin
  if not public.is_member() then
    raise exception 'not a member' using errcode = '42501';
  end if;

  v_date := (
    select min(date(now() at time zone coalesce(timezone, 'UTC')))
    from public.couple_members
  );

  select * into v_day from public.know_me_days where couple_day = v_date;
  if found then
    return v_day;
  end if;

  -- Pick the next unused question: custom first (authoring = wanting it asked),
  -- then oldest-unused catalog.
  select q.id into v_qid
  from public.know_me_questions q
  where q.active
    and not exists (select 1 from public.know_me_days d where d.question_id = q.id)
  order by q.is_custom desc, q.created_at asc
  limit 1;

  -- Exhausted → recycle the least-recently-used question.
  if v_qid is null then
    select q.id into v_qid
    from public.know_me_questions q
    left join (
      select question_id, max(couple_day) as last_used
      from public.know_me_days group by question_id
    ) u on u.question_id = q.id
    where q.active
    order by u.last_used asc nulls first, q.created_at asc
    limit 1;
  end if;

  if v_qid is null then
    raise exception 'no questions available';
  end if;

  insert into public.know_me_days (couple_day, question_id)
  values (v_date, v_qid)
  on conflict (couple_day) do nothing;

  select * into v_day from public.know_me_days where couple_day = v_date;
  return v_day;
end;
$$;

-- ── submit: validates option ids, writes the dual answer + presence ────────
create or replace function public.know_me_submit(p_own text, p_guess text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_date date;
  v_day public.know_me_days;
  v_opts jsonb;
begin
  if not public.is_member() then
    raise exception 'not a member' using errcode = '42501';
  end if;

  v_date := (
    select min(date(now() at time zone coalesce(timezone, 'UTC')))
    from public.couple_members
  );
  select * into v_day from public.know_me_days where couple_day = v_date;
  if not found then
    raise exception 'no question for today' using errcode = 'P0002';
  end if;

  select options into v_opts from public.know_me_questions where id = v_day.question_id;
  if not exists (select 1 from jsonb_array_elements(v_opts) o where o->>'id' = p_own)
     or not exists (select 1 from jsonb_array_elements(v_opts) o where o->>'id' = p_guess) then
    raise exception 'invalid option' using errcode = '22023';
  end if;

  insert into public.know_me_answers (day_id, own_choice, guess_choice)
  values (v_day.id, p_own, p_guess)
  on conflict (day_id, user_id)
    do update set own_choice = excluded.own_choice, guess_choice = excluded.guess_choice;

  insert into public.know_me_presence (day_id)
  values (v_day.id)
  on conflict (day_id, user_id) do nothing;
end;
$$;

-- ── reveal: masks the partner's choices until BOTH have submitted ──────────
create or replace function public.know_me_reveal(p_day_id uuid)
returns table (
  user_id uuid,
  is_self boolean,
  own_choice text,
  guess_choice text,
  reaction_path text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_both boolean;
begin
  if not public.is_member() then
    raise exception 'not a member' using errcode = '42501';
  end if;
  v_both := (select count(*) = 2 from public.know_me_answers where day_id = p_day_id);
  return query
    select
      a.user_id,
      (a.user_id = auth.uid()) as is_self,
      case when a.user_id = auth.uid() or v_both then a.own_choice else null end,
      case when a.user_id = auth.uid() or v_both then a.guess_choice else null end,
      a.reaction_path
    from public.know_me_answers a
    where a.day_id = p_day_id;
end;
$$;

-- ── history view: ONLY days where both submitted (no today-incomplete leak) ─
create view public.know_me_revealed with (security_invoker = true) as
  select a.*
  from public.know_me_answers a
  where public.is_member()
    and (select count(*) from public.know_me_answers b where b.day_id = a.day_id) = 2;

-- ── Seed ~24 starter questions (created_by NULL = catalog) ─────────────────
insert into public.know_me_questions (prompt, category, options) values
  ('My ideal Friday night?', 'love', '[{"id":"a","label":"Cozy night in with a movie"},{"id":"b","label":"Dinner out somewhere new"},{"id":"c","label":"Friends over for games"},{"id":"d","label":"A spontaneous adventure"}]'),
  ('My comfort food when I''m sad?', 'food', '[{"id":"a","label":"Something sweet"},{"id":"b","label":"A big bowl of pasta"},{"id":"c","label":"Spicy takeout"},{"id":"d","label":"Mom''s home cooking"}]'),
  ('My biggest little fear?', 'quirks', '[{"id":"a","label":"Spiders / bugs"},{"id":"b","label":"Heights"},{"id":"c","label":"The dark"},{"id":"d","label":"Being late"}]'),
  ('Where do I most want us to travel next?', 'future', '[{"id":"a","label":"Japan"},{"id":"b","label":"Italy"},{"id":"c","label":"Patagonia"},{"id":"d","label":"Somewhere with a beach"}]'),
  ('My love language?', 'love', '[{"id":"a","label":"Words of affirmation"},{"id":"b","label":"Quality time"},{"id":"c","label":"Physical touch"},{"id":"d","label":"Acts of service"}]'),
  ('How do I take my coffee?', 'quirks', '[{"id":"a","label":"Black"},{"id":"b","label":"With milk"},{"id":"c","label":"Sweet and creamy"},{"id":"d","label":"I prefer tea"}]'),
  ('What makes me laugh the hardest?', 'quirks', '[{"id":"a","label":"Dumb puns"},{"id":"b","label":"Slapstick / fails"},{"id":"c","label":"Dark humor"},{"id":"d","label":"Your impressions"}]'),
  ('My dream first home with you?', 'future', '[{"id":"a","label":"A cozy city apartment"},{"id":"b","label":"A house with a garden"},{"id":"c","label":"A cabin in nature"},{"id":"d","label":"Anywhere, as long as it''s us"}]'),
  ('My go-to karaoke song?', 'quirks', '[{"id":"a","label":"A power ballad"},{"id":"b","label":"Something pop"},{"id":"c","label":"A classic rock anthem"},{"id":"d","label":"I would never sing"}]'),
  ('What relaxes me most after a hard day?', 'love', '[{"id":"a","label":"A long call with you"},{"id":"b","label":"A hot shower"},{"id":"c","label":"Music and lying down"},{"id":"d","label":"A walk outside"}]'),
  ('My favorite season?', 'general', '[{"id":"a","label":"Spring"},{"id":"b","label":"Summer"},{"id":"c","label":"Autumn"},{"id":"d","label":"Winter"}]'),
  ('What do I value most in us?', 'love', '[{"id":"a","label":"How we laugh together"},{"id":"b","label":"How safe I feel"},{"id":"c","label":"How we dream together"},{"id":"d","label":"How honest we are"}]'),
  ('My guilty-pleasure snack?', 'food', '[{"id":"a","label":"Chips"},{"id":"b","label":"Chocolate"},{"id":"c","label":"Ice cream"},{"id":"d","label":"Something salty-and-sweet"}]'),
  ('If I had a free day completely alone?', 'quirks', '[{"id":"a","label":"Sleep in and do nothing"},{"id":"b","label":"A hobby project"},{"id":"c","label":"Explore the city"},{"id":"d","label":"Read all day"}]'),
  ('What I find most attractive about you?', 'love', '[{"id":"a","label":"Your mind"},{"id":"b","label":"Your kindness"},{"id":"c","label":"Your smile"},{"id":"d","label":"Your confidence"}]'),
  ('My morning personality?', 'quirks', '[{"id":"a","label":"Bright and chatty"},{"id":"b","label":"Slow and grumpy"},{"id":"c","label":"Quiet but okay"},{"id":"d","label":"Snooze five times"}]'),
  ('Pets in our future?', 'future', '[{"id":"a","label":"A dog"},{"id":"b","label":"A cat"},{"id":"c","label":"Both"},{"id":"d","label":"Plants only"}]'),
  ('My favorite way you say I love you?', 'love', '[{"id":"a","label":"Saying it out loud"},{"id":"b","label":"A long hug"},{"id":"c","label":"Little notes"},{"id":"d","label":"Doing something for me"}]'),
  ('My biggest dream right now?', 'future', '[{"id":"a","label":"Closing the distance"},{"id":"b","label":"A career goal"},{"id":"c","label":"Traveling the world"},{"id":"d","label":"A calm, happy life"}]'),
  ('What I''d grab if the house were on fire (besides you)?', 'quirks', '[{"id":"a","label":"My phone"},{"id":"b","label":"A photo / keepsake"},{"id":"c","label":"My laptop"},{"id":"d","label":"Nothing, just run"}]'),
  ('My favorite kind of date with you?', 'love', '[{"id":"a","label":"A fancy dinner"},{"id":"b","label":"Cooking together"},{"id":"c","label":"An adventure outdoors"},{"id":"d","label":"A lazy movie marathon"}]'),
  ('How I handle stress?', 'quirks', '[{"id":"a","label":"Talk it out"},{"id":"b","label":"Go quiet"},{"id":"c","label":"Stay busy"},{"id":"d","label":"Need a hug"}]'),
  ('My favorite holiday?', 'general', '[{"id":"a","label":"New Year"},{"id":"b","label":"My birthday"},{"id":"c","label":"Christmas"},{"id":"d","label":"Our anniversary"}]'),
  ('What I want more of in our days?', 'love', '[{"id":"a","label":"More calls"},{"id":"b","label":"More surprises"},{"id":"c","label":"More plans for the future"},{"id":"d","label":"More silly moments"}]');
