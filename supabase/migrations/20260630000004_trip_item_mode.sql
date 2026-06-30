-- A city carries the transport mode for its onward leg (car/bus/flight/…), so
-- the drawn route can colour each hop by how you travel it.
alter table public.trip_items
  add column if not exists mode text
  check (
    mode is null
    or mode in ('car', 'bus', 'flight', 'train', 'ferry', 'walk')
  );
