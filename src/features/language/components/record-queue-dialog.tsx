import { useEffect, useRef, useState } from 'react';
import { Check, SkipForward } from 'lucide-react';
import { useHotkeys } from '@kernel/hooks';
import { Button, Dialog, Kbd, type AudioClip } from '@kernel/ui';
import { useUpdateVocab } from '../api/vocab';
import { headword, meaningOf } from '../lib/pick';
import { AudioField } from './kit';
import type { Lang, Vocab } from '../types';

/**
 * Words, one after another, each waiting for her voice.
 *
 * Given the silent ones, or whichever she chose: the word, the meaning, a
 * recorder. Keep it and the next one comes up; Enter keeps, Space skips.
 * Recording twelve words used to mean opening twelve sheets. The silent
 * ones come first, so a chosen batch that mixes both never makes her wait.
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
      const list = wordsRef.current;
      setQueue([
        ...list.filter((w) => !w.audio_path),
        ...list.filter((w) => !!w.audio_path),
      ]);
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
      {
        id: word.id,
        patch: {},
        audio: clip,
        previousAudioPath: word.audio_path,
      },
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
      title={word ? `${at + 1} of ${queue.length}` : 'Your voice'}
      size="sm"
    >
      {!word ? (
        <div className="space-y-3 py-2 text-center">
          <p className="font-sans text-lg font-bold text-fg">
            {queue.length === 0
              ? 'Every word has your voice.'
              : 'That is all of them.'}
          </p>
          {kept > 0 && (
            <p className="font-sans text-sm text-muted">{kept} recorded.</p>
          )}
          <Button full variant="secondary" onClick={onClose}>
            Done
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="rounded-card border border-fg/[0.06] bg-surface px-4 py-3.5">
            <p className="font-display text-[30px] font-semibold leading-tight text-fg">
              {headword(word)}
            </p>
            <p className="font-sans text-sm font-medium text-muted">
              {meaningOf(word, support)}
            </p>
          </div>
          <AudioField
            label="Say it"
            currentPath={word.audio_path}
            onClip={setClip}
            resetKey={word.id}
          />
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={next}>
              <SkipForward className="h-4 w-4" /> Skip
            </Button>
            <Button disabled={!clip || update.isPending} onClick={keep}>
              <Check className="h-4 w-4" /> Keep it
            </Button>
          </div>
          <p className="hidden text-center font-sans text-xs text-muted md:block">
            <Kbd>Enter</Kbd> keeps, <Kbd>Space</Kbd> skips
          </p>
        </div>
      )}
    </Dialog>
  );
}
