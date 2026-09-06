import { useEffect, useRef, useState } from 'react';
import { Check, SkipForward } from 'lucide-react';
import { useHotkeys } from '@kernel/hooks';
import { Button, Dialog, Kicker, type AudioClip } from '@kernel/ui';
import { useUpdateVocab } from '../api/vocab';
import { headword, meaningOf } from '../lib/pick';
import { AudioField } from './kit';
import type { Lang, Vocab } from '../types';

/**
 * The silent words, one after another.
 *
 * Every word without her recording, in a row: the word, the meaning, a
 * recorder. Keep it and the next one comes up; Enter keeps, Space skips.
 * Recording twelve words used to mean opening twelve sheets.
 */
export function RecordQueueDialog({
  open,
  onClose,
  words,
  support,
}: {
  open: boolean;
  onClose: () => void;
  words: Vocab[];
  support: Lang;
}) {
  // Frozen for the sitting: each save refetches the dictionary, the word
  // just recorded dropped out of a live filter, and every save skipped one.
  const [queue, setQueue] = useState<Vocab[]>([]);
  const wordsRef = useRef(words);
  wordsRef.current = words;
  const [at, setAt] = useState(0);
  const [clip, setClip] = useState<AudioClip | null>(null);
  const [kept, setKept] = useState(0);
  const update = useUpdateVocab();
  const word = queue[at];

  useEffect(() => {
    if (open) {
      setQueue(wordsRef.current.filter((w) => !w.audio_path));
      setAt(0);
      setKept(0);
      setClip(null);
    }
  }, [open]);

  const next = () => {
    setClip(null);
    setAt((n) => n + 1);
  };
  const keep = () => {
    if (!word || !clip || update.isPending) return;
    update.mutate(
      { id: word.id, patch: {}, audio: clip },
      {
        onSuccess: () => {
          setKept((n) => n + 1);
          next();
        },
      }
    );
  };
  useHotkeys({ enter: keep, space: next }, { enabled: open && !!word });

  return (
    <Dialog
      placement="auto"
      open={open}
      onClose={onClose}
      title="The silent ones"
      size="sm"
    >
      {!word ? (
        <div className="space-y-2 py-2 text-center">
          <p className="font-display text-xl text-fg">
            {queue.length === 0
              ? 'Every word has your voice.'
              : 'That is all of them.'}
          </p>
          {kept > 0 && (
            <p className="font-sans text-sm text-muted">{kept} recorded.</p>
          )}
          <Button variant="secondary" onClick={onClose}>
            Done
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <Kicker as="p" tone="muted">
            {at + 1} of {queue.length}
          </Kicker>
          <div className="rounded-lg bg-surface px-4 py-3">
            <p className="font-display text-3xl font-semibold text-fg">
              {headword(word)}
            </p>
            <p className="font-sans text-sm text-muted">
              {meaningOf(word, support)}
            </p>
          </div>
          <AudioField label="Say it" onClip={setClip} resetKey={word.id} />
          <div className="flex gap-2">
            <Button full variant="secondary" onClick={next}>
              <SkipForward size={15} /> Skip
            </Button>
            <Button full disabled={!clip || update.isPending} onClick={keep}>
              <Check size={15} /> Keep it
            </Button>
          </div>
          <p className="text-center font-sans text-xs text-muted">
            Enter keeps - Space skips
          </p>
        </div>
      )}
    </Dialog>
  );
}
