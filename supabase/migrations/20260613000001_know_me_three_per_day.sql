-- ════════════════════════════════════════════════════════════════════════
-- Katitos — Know-Me: THREE questions per couple-day (was one)
--
-- A day now carries up to three question assignments, addressed by `slot`
-- (0,1,2). Each slot is an independent know_me_days row, so answers, presence,
-- reveal and history all keep working unchanged — they're already keyed by
-- day_id. The only new surface is submitting against a SPECIFIC day_id
-- (know_me_submit_day), because "today" is no longer a single row.
-- ════════════════════════════════════════════════════════════════════════

-- couple_day is no longer unique on its own — (couple_day, slot) is.
alter table public.know_me_days
  drop constraint if exists know_me_days_couple_day_key;

alter table public.know_me_days
  add column if not exists slot smallint not null default 0;

alter table public.know_me_days
  drop constraint if exists know_me_days_day_slot_key;
alter table public.know_me_days
  add constraint know_me_days_day_slot_key unique (couple_day, slot);

-- ── ensure_today: assign THREE distinct questions for the day (idempotent) ──
-- Return type widens single-row → setof, so the old definition must be dropped.
drop function if exists public.know_me_ensure_today();
create or replace function public.know_me_ensure_today()
returns setof public.know_me_days
language plpgsql
security definer
set search_path = public
as $$
declare
  v_date date;
  v_existing int;
  v_slot smallint;
  v_qid uuid;
begin
  if not public.is_member() then
    raise exception 'not a member' using errcode = '42501';
  end if;

  v_date := (
    select min(date(now() at time zone coalesce(timezone, 'UTC')))
    from public.couple_members
  );

  -- Fill any missing slots (0,1,2) for today, one distinct question each.
  for v_slot in 0..2 loop
    select count(*) into v_existing
    from public.know_me_days
    where couple_day = v_date and slot = v_slot;
    if v_existing > 0 then
      continue;
    end if;

    -- Prefer never-used questions (custom first); never repeat a question
    -- already chosen for today.
    select q.id into v_qid
    from public.know_me_questions q
    where q.active
      and not exists (select 1 from public.know_me_days d where d.question_id = q.id)
      and q.id not in (
        select question_id from public.know_me_days where couple_day = v_date
      )
    order by q.is_custom desc, q.created_at asc
    limit 1;

    -- Exhausted the fresh pool → recycle the least-recently-used, still not a
    -- duplicate within today.
    if v_qid is null then
      select q.id into v_qid
      from public.know_me_questions q
      left join (
        select question_id, max(couple_day) as last_used
        from public.know_me_days group by question_id
      ) u on u.question_id = q.id
      where q.active
        and q.id not in (
          select question_id from public.know_me_days where couple_day = v_date
        )
      order by u.last_used asc nulls first, q.created_at asc
      limit 1;
    end if;

    -- Truly nothing left to assign (tiny catalog) → stop filling slots.
    exit when v_qid is null;

    insert into public.know_me_days (couple_day, slot, question_id)
    values (v_date, v_slot, v_qid)
    on conflict (couple_day, slot) do nothing;
  end loop;

  return query
    select * from public.know_me_days
    where couple_day = v_date
    order by slot;
end;
$$;

-- ── submit by day_id: the question is now explicit (one of today's slots) ───
create or replace function public.know_me_submit_day(
  p_day_id uuid,
  p_own text,
  p_guess text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_day public.know_me_days;
  v_opts jsonb;
begin
  if not public.is_member() then
    raise exception 'not a member' using errcode = '42501';
  end if;

  select * into v_day from public.know_me_days where id = p_day_id;
  if not found then
    raise exception 'no such question' using errcode = 'P0002';
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
