-- ════════════════════════════════════════════════════════════════════════
-- Katitos — Georgia trip planner: coordinates + day scheduling + wishlist
-- Itinerary items gain a map location (lat/lng) and a planned day, and a new
-- 'wish' kind so the wishlist (things to buy/eat/bring) lives in the same table.
-- ════════════════════════════════════════════════════════════════════════

alter table public.trip_items
  add column if not exists lat double precision,
  add column if not exists lng double precision,
  add column if not exists day date;

-- Widen the kind check to include 'wish'.
alter table public.trip_items
  drop constraint if exists trip_items_kind_check;
alter table public.trip_items
  add constraint trip_items_kind_check
  check (kind in ('idea', 'place', 'todo', 'game', 'tracker', 'note', 'wish'));

create index if not exists trip_items_day_idx on public.trip_items (trip_id, day);
