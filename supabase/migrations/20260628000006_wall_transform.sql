-- ════════════════════════════════════════════════════════════════════════
-- Katitos - Wall (chalkboard) notes gain touch transforms
--   scale → pinch-to-resize; width → manual text-box width so a short phrase
--   can stay on one line. rotation already exists (set at creation); the app
--   now lets you rotate by touch too.
-- ════════════════════════════════════════════════════════════════════════

alter table public.chalkboard_notes
  add column if not exists scale numeric not null default 1
    check (scale between 0.4 and 3),
  add column if not exists width numeric;
