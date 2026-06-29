-- Add a 'city' kind to trip_items so the Summer map can tell ordered route
-- cities (joined by a drawn line) apart from plain places inside a city.
alter table public.trip_items drop constraint if exists trip_items_kind_check;
alter table public.trip_items
  add constraint trip_items_kind_check check (
    kind in (
      'idea',
      'place',
      'todo',
      'game',
      'tracker',
      'note',
      'wish',
      'city'
    )
  );
