import { useEffect, useState } from 'react';
import { Check, Plus } from 'lucide-react';
import { cn } from '@kernel/lib';
import {
  Button,
  Chip,
  ChipRow,
  Dialog,
  Field,
  FieldRow,
  Input,
  SearchInput,
  Spinner,
  type AudioClip,
} from '@kernel/ui';
import { useAddVocab, useVocab } from '../api/vocab';
import { useSetBlockVocab } from '../api/block-vocab';
import { useLanguages } from '../lib/languages';
import { headword } from '../lib/pick';
import { AudioField, VocabRow } from './kit';
import { LANG_NATIVE_LABELS, type Lang, type Vocab } from '../types';

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
  target,
}: {
  open: boolean;
  onClose: () => void;
  blockId: string;
  lessonId: string;
  /** The words already on this block, in order. */
  selected: Vocab[];
  /** The language this lesson teaches — the words are in it, not in yours. */
  target: Lang;
}) {
  const { native: support } = useLanguages();
  const [search, setSearch] = useState('');
  // What the QUERY sees, a beat behind the box — each keystroke used to fire
  // its own 500-row search and keep it in the cache.
  const [term, setTerm] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setTerm(search), 250);
    return () => clearTimeout(t);
  }, [search]);
  // The dictionary of the language being TAUGHT here. Using "what I'm learning"
  // would show her a list of Spanish words while she writes a Russian lesson.
  const { data: words, isLoading } = useVocab(target, term);
  const setBlockVocab = useSetBlockVocab();
  const addVocab = useAddVocab();

  const [chosen, setChosen] = useState<Vocab[]>(selected);
  const [newTerm, setNewTerm] = useState('');
  const [newMeaning, setNewMeaning] = useState('');
  const [newAudio, setNewAudio] = useState<AudioClip | null>(null);
  // Bumped after each word goes in, so the recorder starts clean for the next.
  const [added, setAdded] = useState(0);

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
    if (!newTerm.trim()) return;
    addVocab.mutate(
      {
        termLang: target,
        [target]: newTerm,
        [support === target ? 'en' : support]: newMeaning,
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
              term_lang: target,
              [target]: newTerm.trim(),
              [support === target ? 'en' : support]: newMeaning,
            } as unknown as Vocab,
          ]);
          setNewTerm('');
          setNewMeaning('');
          setNewAudio(null);
          setAdded((n) => n + 1);
        },
      }
    );
  };

  return (
    <Dialog
      placement="auto"
      open={open}
      onClose={onClose}
      title="The words"
      size="lg"
    >
      <div className="space-y-2">
        {chosen.length > 0 && (
          <ChipRow>
            {chosen.map((w) => (
              <Chip
                key={w.id}
                selected
                onRemove={() => toggle(w)}
                removeLabel={`Take ${headword(w)} out`}
              >
                {headword(w)}
              </Chip>
            ))}
          </ChipRow>
        )}

        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Look for a word"
        />

        {isLoading ? (
          <Spinner className="mx-auto h-5 w-5" />
        ) : (
          <ul className="max-h-64 divide-y divide-fg/5 overflow-y-auto rounded-lg bg-surface px-3">
            {(words ?? []).map((w) => {
              const on = chosen.some((c) => c.id === w.id);
              return (
                <VocabRow
                  key={w.id}
                  word={w}
                  support={support}
                  selected={on}
                  onClick={() => toggle(w)}
                  trailing={
                    <span
                      className={cn(
                        'grid h-5 w-5 shrink-0 place-items-center rounded-full',
                        on ? 'bg-accent text-accent-fg' : 'bg-surface-2'
                      )}
                    >
                      {on && <Check className="h-3 w-3" />}
                    </span>
                  }
                />
              );
            })}
          </ul>
        )}

        {/* A word she needs mid-lesson shouldn't send her to another screen. */}
        <FieldRow>
          <Field label="Not there yet?">
            <Input
              value={newTerm}
              onChange={(e) => setNewTerm(e.target.value)}
              placeholder={target === 'ru' ? 'слово' : 'palabra'}
            />
          </Field>
          <Field
            label={LANG_NATIVE_LABELS[support === target ? 'en' : support]}
          >
            <Input
              value={newMeaning}
              onChange={(e) => setNewMeaning(e.target.value)}
              placeholder="what it means"
            />
          </Field>
        </FieldRow>
        {/* A Fieldset, not a Field: tapping a label's caption presses the
            first button inside it — which was Record. */}
        <AudioField
          label="Say it"
          hint="So the word is not silent in the lesson"
          onClip={setNewAudio}
          resetKey={added}
        />
        <Button
          variant="secondary"
          full
          onClick={addAndChoose}
          disabled={!newTerm.trim() || addVocab.isPending}
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
    </Dialog>
  );
}
