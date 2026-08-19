import { useEffect, useState } from 'react';
import { Check, Plus, Search } from 'lucide-react';
import { cn } from '@kernel/lib';
import {
  AudioRecorder,
  Button,
  Field,
  FieldRow,
  Input,
  Sheet,
  Spinner,
  type AudioClip,
} from '@kernel/ui';
import { useAddVocab, useVocab } from '../api/vocab';
import { useSetBlockVocab } from '../api/block-vocab';
import { useLangPrefs } from '../lib/lang-prefs';
import { meaningOf } from '../lib/pick';
import type { Vocab } from '../types';

/**
 * Choose the words a lesson teaches.
 *
 * Search the dictionary and tap; a word that isn't in it yet can be added right
 * here, because stopping mid-lesson to go and file a word somewhere else is how
 * a lesson stops getting written.
 */
export function VocabPickerSheet({
  open,
  onClose,
  blockId,
  lessonId,
  selected,
}: {
  open: boolean;
  onClose: () => void;
  blockId: string;
  lessonId: string;
  /** The words already on this block, in order. */
  selected: Vocab[];
}) {
  const support = useLangPrefs((s) => s.supportLang);
  const [search, setSearch] = useState('');
  const { data: words, isLoading } = useVocab('ru', search);
  const setBlockVocab = useSetBlockVocab();
  const addVocab = useAddVocab();

  const [chosen, setChosen] = useState<Vocab[]>(selected);
  const [newRu, setNewRu] = useState('');
  const [newMeaning, setNewMeaning] = useState('');
  const [newAudio, setNewAudio] = useState<AudioClip | null>(null);

  // Re-seed when the sheet is opened for a different block.
  useEffect(() => {
    if (open) setChosen(selected);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, blockId]);

  const toggle = (word: Vocab) =>
    setChosen((c) =>
      c.some((w) => w.id === word.id)
        ? c.filter((w) => w.id !== word.id)
        : [...c, word]
    );

  const addAndChoose = () => {
    if (!newRu.trim()) return;
    addVocab.mutate(
      {
        termLang: 'ru',
        ru: newRu,
        ...(support === 'es' ? { es: newMeaning } : { en: newMeaning }),
        // The shortcut she will actually use while writing a lesson. Without
        // this it produced silent words, which is exactly what the vocab block
        // exists to avoid.
        audio: newAudio,
      },
      {
        onSuccess: (id) => {
          setChosen((c) => [
            ...c,
            {
              id,
              ru: newRu.trim(),
              en: support === 'en' ? newMeaning : null,
              es: support === 'es' ? newMeaning : null,
            } as Vocab,
          ]);
          setNewRu('');
          setNewMeaning('');
          setNewAudio(null);
        },
      }
    );
  };

  return (
    <Sheet open={open} onClose={onClose} title="The words" size="full">
      <div className="space-y-3">
        {chosen.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {chosen.map((w) => (
              <button
                key={w.id}
                type="button"
                onClick={() => toggle(w)}
                className="lift-press rounded-full bg-accent px-3 py-1 font-sans text-sm text-accent-fg"
              >
                {w.ru} ×
              </button>
            ))}
          </div>
        )}

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Look for a word"
            className="pl-9"
          />
        </div>

        {isLoading ? (
          <Spinner className="mx-auto h-5 w-5" />
        ) : (
          <ul className="max-h-64 divide-y divide-fg/5 overflow-y-auto rounded-lg bg-surface px-3">
            {(words ?? []).map((w) => {
              const on = chosen.some((c) => c.id === w.id);
              return (
                <li key={w.id}>
                  <button
                    type="button"
                    onClick={() => toggle(w)}
                    className="flex w-full items-center gap-2 py-2 text-left"
                  >
                    <span
                      className={cn(
                        'grid h-5 w-5 shrink-0 place-items-center rounded-full',
                        on ? 'bg-accent text-accent-fg' : 'bg-surface-2'
                      )}
                    >
                      {on && <Check className="h-3 w-3" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-display text-base text-fg">
                        {w.ru}
                      </span>
                      <span className="block truncate font-sans text-xs text-muted">
                        {meaningOf(w, support)}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {/* A word she needs mid-lesson shouldn't send her to another screen. */}
        <FieldRow>
          <Field label="Not there yet?">
            <Input
              value={newRu}
              onChange={(e) => setNewRu(e.target.value)}
              placeholder="слово"
            />
          </Field>
          <Field label={support === 'es' ? 'Español' : 'English'}>
            <Input
              value={newMeaning}
              onChange={(e) => setNewMeaning(e.target.value)}
              placeholder={support === 'es' ? 'palabra' : 'word'}
            />
          </Field>
        </FieldRow>
        <Field label="Say it" hint="So the word is not silent in the lesson">
          <AudioRecorder onRecorded={setNewAudio} />
        </Field>
        <Button
          variant="secondary"
          full
          onClick={addAndChoose}
          disabled={!newRu.trim() || addVocab.isPending}
        >
          <Plus size={14} /> Add it to the dictionary
        </Button>

        <Button
          full
          disabled={setBlockVocab.isPending}
          onClick={() =>
            setBlockVocab.mutate(
              { blockId, lessonId, vocabIds: chosen.map((w) => w.id) },
              { onSuccess: onClose }
            )
          }
        >
          Put {chosen.length} {chosen.length === 1 ? 'word' : 'words'} in the
          lesson
        </Button>
      </div>
    </Sheet>
  );
}
