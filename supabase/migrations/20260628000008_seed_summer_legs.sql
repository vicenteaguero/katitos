-- ════════════════════════════════════════════════════════════════════════
-- Katitos — seed the Summer route legs for the EXISTING special trip.
--   The app self-heals legs only when it CREATES the trip, but prod's trip
--   already existed (it was renamed, not created), so it had no legs and the
--   route map drew nothing. Seed Istanbul→Trabzon→Batumi→Tbilisi here.
--   Idempotent: only seeds when the trip currently has zero legs. Uses the
--   trip's own created_by (trip_legs.created_by is NOT NULL and auth.uid() is
--   null under a migration role).
-- ════════════════════════════════════════════════════════════════════════

insert into public.trip_legs
  (trip_id, position, from_label, to_label,
   from_lat, from_lng, to_lat, to_lng, mode, country, created_by)
select t.id, v.position, v.from_label, v.to_label,
       v.from_lat, v.from_lng, v.to_lat, v.to_lng, v.mode, v.country, t.created_by
from public.trips t
cross join (values
  (0, 'Istanbul', 'Trabzon', 41.0082, 28.9784, 41.0015, 39.7178, 'car', 'TR'),
  (1, 'Trabzon', 'Batumi', 41.0015, 39.7178, 41.6168, 41.6367, 'bus', null),
  (2, 'Batumi', 'Tbilisi', 41.6168, 41.6367, 41.7151, 44.8271, 'car', 'GE')
) as v(position, from_label, to_label,
       from_lat, from_lng, to_lat, to_lng, mode, country)
where t.is_special = true
  and t.created_by is not null
  and not exists (select 1 from public.trip_legs l where l.trip_id = t.id);
