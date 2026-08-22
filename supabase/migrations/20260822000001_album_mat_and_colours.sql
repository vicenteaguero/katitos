-- ════════════════════════════════════════════════════════════════════════
-- Katitos — the mount gets a thickness, and ten colours instead of six
--
--   A photo on a page sits on a card, and until now that card was a fixed
--   five pixels of cream whatever the picture was, whatever size it had been
--   dragged to, and whatever it had been cut into. A snapshot border, a photo
--   print's border and a gallery mat are three different objects; this is the
--   number that tells them apart.
--
--   ── Safe while the OLD bundle is still running ────────────────────────
--   The service worker does not skipWaiting, so both builds share this
--   database for a session.
--     • `mat_width` is NOT NULL DEFAULT, so the old build's inserts — which
--       know nothing about it — still succeed, and its `select *` ignores a
--       column it has no idea about.
--     • `frame_color`'s check is WIDENED. Every value the old build can write
--       stays in the set. An old bundle that READS 'moss' finds no matching
--       class and falls through to the CSS variable's default: a cream mount,
--       not a crash.
-- ════════════════════════════════════════════════════════════════════════

alter table public.album_placements
  add column if not exists mat_width text not null default 'medium';

alter table public.album_placements
  drop constraint if exists album_placements_mat_width_chk;
alter table public.album_placements add constraint album_placements_mat_width_chk
  check (mat_width in ('thin', 'medium', 'wide'));

-- ── the colours grow ──────────────────────────────────────────────────────
-- By DISCOVERY, not by name: a constraint created by a local `db reset` and
-- one created by an earlier push in production can carry different generated
-- names, and dropping a guessed name succeeds silently while leaving the old
-- six-value check standing — after which every new colour is rejected in
-- production only. A LOOP, not `select ... into`, because a table can end up
-- carrying two matching checks and picking one leaves the other to reject
-- every write. And `not ilike '%mat_width%'` so it cannot eat the check added
-- twenty lines above.
do $$
declare c record;
begin
  for c in
    select conname
      from pg_constraint
     where conrelid = 'public.album_placements'::regclass
       and contype = 'c'
       and pg_get_constraintdef(oid) ilike '%frame_color%'
       and pg_get_constraintdef(oid) not ilike '%mat_width%'
  loop
    execute format(
      'alter table public.album_placements drop constraint %I', c.conname
    );
  end loop;
end $$;

alter table public.album_placements add constraint album_placements_frame_color_chk
  check (frame_color in (
    -- already in the wild, never narrowed away
    'cream', 'white', 'gold', 'wine', 'ink', 'kraft',
    -- hers: wine, brown, glossy green, black, white
    'brown', 'moss', 'black',
    -- his: sandstorm, military green, charcoal, snow
    'sand', 'olive', 'charcoal', 'snow'
  ));
