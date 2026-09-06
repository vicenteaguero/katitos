-- ════════════════════════════════════════════════════════════════════════
-- Katitos - choosing a block's words must be all-or-nothing
--
--   The client did it in two calls: delete every row for the block, then
--   insert the new list. The delete commits first, so anything that goes wrong
--   in between - a dropped connection on a train, a word the other one deleted
--   a second earlier - leaves the block with NO words and no way back. She
--   watches an error toast over a list she just lost.
--
--   One statement instead. `security invoker` so the members-only policy still
--   applies exactly as it did.
-- ════════════════════════════════════════════════════════════════════════

create or replace function public.set_block_vocab(p_block uuid, p_vocab uuid[])
returns void
language plpgsql
security invoker
as $$
begin
  delete from public.lang_block_vocab where block_id = p_block;
  insert into public.lang_block_vocab (block_id, vocab_id, position)
  select p_block, v, ord - 1
    from unnest(p_vocab) with ordinality as t(v, ord);
end $$;
