import { useState } from 'react';
import { toast, type AudioClip } from '@kernel/ui';
import { useCreateBlock } from './lessons.mutations';
import { useAddVocab } from './vocab';
import { useSetBlockVocab } from './block-vocab';
import { useLanguages } from '../lib/languages';
import type { Lang, LessonFull } from '../types';

/**
 * A word that came up mid-class, into the dictionary and into this lesson
 * in one go - the thing she used to do afterwards from memory, or not.
 *
 * Into this slide's word list, else the lesson's last one, else a new one
 * at the end: the word must land in the lesson, not only in the dictionary.
 */
export function useCatchWord(lesson: LessonFull, blockId: string | null) {
  const { learning } = useLanguages();
  const target = lesson.targetLang;
  // The meaning is for the one LEARNING - in their language, not hers.
  const meaningLang: Lang = learning === target ? 'en' : learning;
  const add = useAddVocab();
  const setBlockVocab = useSetBlockVocab();
  const createBlock = useCreateBlock();
  const [busy, setBusy] = useState(false);

  const catchWord = async (
    term: string,
    meaning: string,
    clip: AudioClip | null
  ): Promise<boolean> => {
    if (!term.trim() || busy) return false;
    setBusy(true);
    try {
      const id = await add.mutateAsync({
        termLang: target,
        [target]: term,
        [meaningLang]: meaning,
        audio: clip,
      });
      let block =
        blockId ??
        [...lesson.blocks].reverse().find((b) => b.kind === 'vocab')?.id ??
        null;
      if (!block) {
        block = await createBlock.mutateAsync({
          lessonId: lesson.id,
          kind: 'vocab',
          position: lesson.blocks.length,
        });
      }
      const existing = (lesson.vocabByBlock[block] ?? [])
        .map((w) => w.id)
        .filter((x) => x !== id);
      await setBlockVocab.mutateAsync({
        blockId: block,
        lessonId: lesson.id,
        vocabIds: [...existing, id],
      });
      toast.success(`«${term.trim()}» is in the lesson`);
      return true;
    } catch {
      /* the mutation has already said what went wrong */
      return false;
    } finally {
      setBusy(false);
    }
  };

  return { catchWord, busy, target, meaningLang };
}
