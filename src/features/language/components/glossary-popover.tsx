import { useMemo, useState } from 'react';
import { HelpCircle } from 'lucide-react';
import { usePartner } from '@kernel/auth';
import { notifyPartner } from '@kernel/push';
import { BUCKETS } from '@kernel/storage';
import { Button, Dialog, PlayButton, toast } from '@kernel/ui';
import { useAllVocab } from '../api/vocab';
import { findWord } from '../lib/lemma';
import { headword, meaningOf, noteOf } from '../lib/pick';
import type { Lang } from '../types';

/**
 * Tap a word in a lesson, see what it means.
 *
 * Looked up in the dictionary of the language being taught, with a lemma
 * step in between — «городе» finds «город». When the word is not there,
 * the miss is a question for her, not a dead end.
 */
export function GlossaryPopover({
  word,
  target,
  support,
  onClose,
}: {
  word: string | null;
  target: Lang;
  support: Lang;
  onClose: () => void;
}) {
  const { data: words } = useAllVocab(target);
  const { self } = usePartner();
  const [asked, setAsked] = useState<string | null>(null);

  const found = useMemo(
    () => (word && words ? findWord(word, target, words, headword) : null),
    [word, words, target]
  );

  const ask = async () => {
    if (!word) return;
    setAsked(word);
    const { ok } = await notifyPartner({
      kind: 'lesson',
      title: `«${word}»?`,
      body: `${self?.display_name ?? 'Your love'} wants to know what it means`,
      url: '/language/dictionary',
      tag: `ask:${word}`,
    });
    toast[ok ? 'success' : 'error'](ok ? 'Asked' : "Couldn't send");
  };

  return (
    <Dialog
      placement="auto"
      open={!!word}
      onClose={onClose}
      title={word ?? ''}
      size="sm"
    >
      {found ? (
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <p className="min-w-0 flex-1 font-display text-2xl text-fg">
              {found.stress || headword(found)}
            </p>
            {found.audio_path && (
              <PlayButton
                bucket={BUCKETS.languageAudio}
                path={found.audio_path}
                size="sm"
                label="Hear her"
              />
            )}
          </div>
          {found.transliteration && (
            <p className="font-display text-sm italic text-copper">
              {found.transliteration}
            </p>
          )}
          <p className="font-sans text-base text-fg">
            {meaningOf(found, support)}
          </p>
          {noteOf(found, support) && (
            <p className="font-sans text-xs italic text-muted">
              {noteOf(found, support)}
            </p>
          )}
          {found.part_of_speech && (
            <p className="font-sans text-[0.68rem] uppercase tracking-[0.12em] text-muted">
              {found.part_of_speech}
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <p className="font-sans text-sm text-muted">
            Not in the dictionary yet.
          </p>
          <Button
            size="xs"
            variant="secondary"
            disabled={asked === word}
            onClick={() => void ask()}
          >
            <HelpCircle size={13} />{' '}
            {asked === word ? 'Asked' : `Ask what «${word}» means`}
          </Button>
        </div>
      )}
    </Dialog>
  );
}
