-- ════════════════════════════════════════════════════════════════════════
-- Katitos - the pause is hers to throw, not hers to write
--
--   `five_pauses` shipped with the house policy, `is_member()` both ways, and
--   that is the wrong shape for this one table. The switch is hers and must stay
--   that way; the RECORD of when it was off is what the scheduler trusts when it
--   decides whether a day gets charged. Signed in as her you could write a pause
--   running from the day the Five began to no end at all, and every day in it
--   silently stops being money.
--
--   She would not. That is still not the point: a mechanic she asked for, on an
--   honour system, should not quietly have a switch in it labelled "none of this
--   counted". If she wants out, the switch is one tap and it is honest about the
--   date; if she wants a day forgiven, that is the hard-day button, or him.
--
--   Writes belong to the `five_settings_pause_log` trigger, which is security
--   definer and so runs past RLS as before, and to him. She keeps every read -
--   the dates are hers to see - and she keeps `five_settings.active`, which is
--   the only control she actually needs.
-- ════════════════════════════════════════════════════════════════════════

drop policy if exists members_all on public.five_pauses;

create policy members_read on public.five_pauses
  for select using (public.is_member());

create policy admin_writes on public.five_pauses
  for all using (public.is_admin()) with check (public.is_admin());
