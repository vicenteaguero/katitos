-- The July-5 flight Novosibirsk → Istanbul, drawn as a geodesic arc on the map.
-- Idempotent + self-healing: only the special Summer trip, only if not present.
insert into public.trip_legs (
  trip_id,
  position,
  from_label,
  to_label,
  from_lat,
  from_lng,
  to_lat,
  to_lng,
  mode,
  country,
  depart_date,
  created_by
)
select
  t.id,
  100,
  'Novosibirsk',
  'Istanbul',
  55.0084,
  82.9357,
  41.0082,
  28.9784,
  'flight',
  null,
  '2026-07-05',
  t.created_by
from public.trips t
where
  t.is_special = true
  and not exists (
    select 1
    from public.trip_legs l
    where
      l.trip_id = t.id
      and l.mode = 'flight'
      and l.from_label = 'Novosibirsk'
  );
