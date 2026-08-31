-- ════════════════════════════════════════════════════════════════════════
-- Katitos — a put-away word keeps its place in the block
--
--   `set_block_vocab` replaced the block's whole word list, and the picker
--   can only hand back the words it can see. A word that had been put away
--   (soft-deleted, one tap from Undo) was invisible to it — so the next
--   edit of that block's list deleted the link, and Undo brought the word
--   back into the dictionary but not into the lesson it was taught in.
--
--   Only the visible links are replaced now; hidden ones stay where they
--   were, position and all.
-- ════════════════════════════════════════════════════════════════════════

create or replace function public.set_block_vocab(p_block uuid, p_vocab uuid[])
returns void
language plpgsql
security invoker
as $$
begin
  delete from public.lang_block_vocab bv
   using public.lang_vocab v
   where bv.block_id = p_block
     and v.id = bv.vocab_id
     and v.deleted_at is null;
  insert into public.lang_block_vocab (block_id, vocab_id, position)
  select p_block, v, ord - 1
    from unnest(p_vocab) with ordinality as t(v, ord)
  on conflict (block_id, vocab_id) do update set position = excluded.position;
  -- One clean run of positions over hidden and visible alike, so a word
  -- brought back by Undo does not share a slot with the one after it.
  with ranked as (
    select vocab_id,
           row_number() over (order by position, vocab_id) - 1 as pos
      from public.lang_block_vocab
     where block_id = p_block
  )
  update public.lang_block_vocab bv
     set position = ranked.pos
    from ranked
   where bv.block_id = p_block
     and bv.vocab_id = ranked.vocab_id;
end $$;
