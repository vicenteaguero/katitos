-- The money rule, scenario by scenario, against the real data in ONE
-- transaction that is rolled back, so nothing it does is kept:
--   printf 'begin;\n\\i supabase/tests/money_follows_the_ticks.sql\nrollback;\n' \
--     | psql "$DBURL" -v ON_ERROR_STOP=1 -q
-- Every check raises on failure; a clean run prints one "ok" per scenario.
-- Written against her Saturday 2026-09-26, all five held.

create or replace function pg_temp.day_money(p_day date)
returns text language sql as $$
  select coalesce(string_agg(r, ' ' order by r), '-') from (
    select h.title || ':' || l.direction || '/' || l.reason || '/' || l.amount_cents r
      from public.money_ledger l join public.habits h on h.id = l.habit_id
     where l.user_id = '22222222-2222-2222-2222-222222222222' and l.day = p_day
  ) x;
$$;

create or replace function pg_temp.pots(p_day date)
returns text language sql as $$
  select 'gift=' || coalesce(sum(amount_cents) filter (where direction='gift'),0)
      || ' bet=' || coalesce(sum(amount_cents) filter (where direction='bet'),0)
    from public.money_ledger
   where user_id = '22222222-2222-2222-2222-222222222222' and day = p_day
     and habit_id is not null;
$$;

create or replace function pg_temp.expect(label text, got text, want text)
returns void language plpgsql as $$
begin
  if got is distinct from want then
    raise exception 'FAIL %: got [%] want [%]', label, got, want;
  end if;
  raise notice 'ok  %', label;
end;
$$;

\set her '''22222222-2222-2222-2222-222222222222'''
\set sat '''2026-09-26'''
\set tue '''2026-09-29'''
\set thu '''2026-10-01'''
\set sleep '''35adb565-675c-4843-ba1d-720f2e3d7001'''
\set study '''40971e1d-1019-4825-988a-704d145c78f5'''
\set eat '''39f46073-5bcd-428e-bc30-d334432cd016'''

-- 1. Her Saturday is over in Novosibirsk: it is settled already, all five held.
select pg_temp.expect('saturday settled at her midnight', pg_temp.pots(:sat), 'gift=500 bet=0');

-- 2. Running the rule again changes nothing and says so.
select pg_temp.expect('idempotent', public.money_settle_day(:her, :sat)::text, 'false');

-- 3. He takes a tick back: that habit becomes a bet, marked revoked.
update habit_entries set revoked_at = now() where habit_id = :sleep and day = :sat;
select pg_temp.expect('revoke -> bet', pg_temp.pots(:sat), 'gift=400 bet=300');
select pg_temp.expect('revoke reason', (select reason from money_ledger where habit_id = :sleep and day = :sat), 'revoked');

-- 4. And puts it back.
update habit_entries set revoked_at = null where habit_id = :sleep and day = :sat;
select pg_temp.expect('unrevoke -> gift', pg_temp.pots(:sat), 'gift=500 bet=0');

-- 5. A tick deleted outright is a plain miss.
delete from habit_entries where habit_id = :study and day = :sat;
select pg_temp.expect('delete -> missed', (select direction || '/' || reason from money_ledger where habit_id = :study and day = :sat), 'bet/missed');

-- 6. A late tick (inside her grace) pays again.
insert into habit_entries (habit_id, day, marked_by) values (:study, :sat, :her);
select pg_temp.expect('late tick -> gift', pg_temp.pots(:sat), 'gift=500 bet=0');

-- 7. Three of five still pays and burns as ever.
delete from habit_entries where habit_id in (:study, :eat) and day = :sat;
select pg_temp.expect('two missed', pg_temp.pots(:sat), 'gift=300 bet=600');

-- 7b. Fewer than three is her cheat day: no money at all. A second short day
--     in the same week is an ordinary miss, until the first is filled in and
--     the second becomes the cheat day.
delete from habit_entries where habit_id in (:sleep, :study, :eat) and day = :tue;
select pg_temp.expect('short day is her cheat day', pg_temp.pots(:tue), 'gift=0 bet=0');
delete from habit_entries where habit_id in (:sleep, :study, :eat) and day = :thu;
select pg_temp.expect('second short day is a miss', pg_temp.pots(:thu), 'gift=200 bet=900');
insert into habit_entries (habit_id, day, marked_by)
  select h, :tue::date, :her::uuid from unnest(array[:sleep, :study, :eat]::uuid[]) h;
select pg_temp.expect('cheat day filled in', pg_temp.pots(:tue), 'gift=500 bet=0');
select pg_temp.expect('the cheat moves to thursday', pg_temp.pots(:thu), 'gift=0 bet=0');
insert into habit_entries (habit_id, day, marked_by)
  select h, :thu::date, :her::uuid from unnest(array[:sleep, :study, :eat]::uuid[]) h;
select pg_temp.expect('week restored', pg_temp.pots(:thu), 'gift=500 bet=0');
-- Her old habit left Monday 21 short. That was before her five, so it does not
-- spend the cheat day of Saturday's week.
select pg_temp.expect('before her five counts for nothing', public.habit_cheat_day(:her, '2026-09-21')::text, 'false');

-- 8. The money switched off over that day: nothing; back on: it all returns.
insert into money_pauses (user_id, from_day, to_day) values (:her, :sat, :sat);
select pg_temp.expect('paused day is empty', pg_temp.pots(:sat), 'gift=0 bet=0');
delete from money_pauses where user_id = :her and from_day = :sat;
select pg_temp.expect('unpaused day returns', pg_temp.pots(:sat), 'gift=300 bet=600');
-- an open-ended pause (switch off, never back on) covers it too
insert into money_pauses (user_id, from_day, to_day) values (:her, '2026-09-26', null);
select pg_temp.expect('open pause', pg_temp.pots(:sat), 'gift=0 bet=0');
update money_pauses set from_day = '2026-09-27' where user_id = :her and to_day is null;
select pg_temp.expect('pause moved off it', pg_temp.pots(:sat), 'gift=300 bet=600');
delete from money_pauses where user_id = :her;

-- 9. Stakes are frozen: new dials never reprice a settled day...
update money_settings set gift_cents = 200, bet_cents = 500 where user_id = :her;
insert into habit_entries (habit_id, day, marked_by) values (:eat, :sat, :her);
select pg_temp.expect('frozen stakes on change', pg_temp.pots(:sat), 'gift=400 bet=300');
-- ...even a gift-only day keeps its gift price when a bet appears later
insert into habit_entries (habit_id, day, marked_by) values (:study, :sat, :her);
select pg_temp.expect('all held again', pg_temp.pots(:sat), 'gift=500 bet=0');
delete from habit_entries where habit_id = :study and day = :sat;
select pg_temp.expect('gift keeps 100, new bet at 500', pg_temp.pots(:sat), 'gift=400 bet=500');
insert into habit_entries (habit_id, day, marked_by) values (:study, :sat, :her);
update money_settings set gift_cents = 100, bet_cents = 300 where user_id = :her;

-- 10. Archiving a habit on that day takes it off that day; bringing it back returns it.
update habits set archived_at = '2026-09-26 03:00+00' where id = :sleep;
select pg_temp.expect('archived that day', pg_temp.pots(:sat), 'gift=400 bet=0');
update habits set archived_at = null where id = :sleep;
select pg_temp.expect('unarchived', pg_temp.pots(:sat), 'gift=500 bet=0');
-- archived LATER than the day: the day keeps it
update habits set archived_at = now() where id = :sleep;
select pg_temp.expect('archived later keeps day', pg_temp.pots(:sat), 'gift=500 bet=0');
update habits set archived_at = null where id = :sleep;

-- 11. A habit that starts later leaves the day; weekly carries no money.
update habits set effective_from = '2026-09-27' where id = :sleep;
select pg_temp.expect('starts later', pg_temp.pots(:sat), 'gift=400 bet=0');
update habits set effective_from = '2026-09-26' where id = :sleep;
update habits set schedule = 'weekly' where id = :eat;
select pg_temp.expect('weekly is free', pg_temp.pots(:sat), 'gift=400 bet=0');
update habits set schedule = 'daily' where id = :eat;
select pg_temp.expect('daily again', pg_temp.pots(:sat), 'gift=500 bet=0');
-- a rename moves nothing
update habits set title = 'Sleep well' where id = :sleep;
select pg_temp.expect('rename is free', pg_temp.pots(:sat), 'gift=500 bet=0');
update habits set title = 'Sleep' where id = :sleep;

-- 12. A new habit of hers, started on that day with no tick, is a miss there.
insert into habits (user_id, title, emoji, kind, schedule, slot, effective_from)
values (:her, 'Test', '🧪', 'personal', 'daily', 4, :sat);
select pg_temp.expect('new habit misses', pg_temp.pots(:sat), 'gift=500 bet=300');
-- deleting it takes its row with it
delete from habits where user_id = :her and title = 'Test';
select pg_temp.expect('deleted habit gone', pg_temp.pots(:sat), 'gift=500 bet=0');

-- 13. Her start moved to that day: it is before the money, so nothing; back: all.
update money_settings set started_on = :sat where user_id = :her;
select pg_temp.expect('before the start', pg_temp.pots(:sat), 'gift=0 bet=0');
update money_settings set started_on = '2026-09-25' where user_id = :her;
select pg_temp.expect('start restored', pg_temp.pots(:sat), 'gift=500 bet=0');

-- 14. Today, still running on her clock, never carries money, ticks or not.
select pg_temp.expect('today is not settled',
  public.money_settle_day(:her, (now() at time zone 'Asia/Novosibirsk')::date)::text, 'false');
select pg_temp.expect('today empty', pg_temp.pots((now() at time zone 'Asia/Novosibirsk')::date), 'gift=0 bet=0');

-- 15. His habits and the shared call never touch her money.
select pg_temp.expect('his user has no settings', public.money_settle_day(
  (select user_id from couple_members where role = 'a'), :sat)::text, 'false');

-- 16. SHE ticks through the API, with her own rights: the trigger still pays.
delete from habit_entries where habit_id = :study and day = :sat;
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '22222222-2222-2222-2222-222222222222', 'role', 'authenticated')::text, true);
insert into habit_entries (habit_id, day) values ('40971e1d-1019-4825-988a-704d145c78f5', '2026-09-26');
reset role;
select pg_temp.expect('her own tick pays', pg_temp.pots(:sat), 'gift=500 bet=0');

select pg_temp.expect('the day, row by row', pg_temp.day_money(:sat),
  'Eat well:gift/done/100 Sleep:gift/done/100 Study:gift/done/100 Walk or train:gift/done/100 Work:gift/done/100');
