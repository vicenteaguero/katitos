import { useState } from 'react';
import { nanoid } from 'nanoid';
import { Plus, X } from 'lucide-react';
import {
  AudioRecorder,
  Button,
  Field,
  Input,
  Select,
  Textarea,
  toast,
} from '@kernel/ui';
import { useCreateDeck, useAddCard } from '../api/decks.mutations';
import { DECK_KINDS } from '../types';

interface OptionDraft {
  id: string;
  label: string;
}

export function DeckBuilder({ onDone }: { onDone: () => void }) {
  const createDeck = useCreateDeck();
  const addCard = useAddCard();

  const [deckId, setDeckId] = useState<string | null>(null);
  const [kindIdx, setKindIdx] = useState(0);
  const [title, setTitle] = useState('');
  const [count, setCount] = useState(0);

  // card draft
  const [text, setText] = useState('');
  const [imageBlob, setImageBlob] = useState<Blob | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [options, setOptions] = useState<OptionDraft[]>([]);
  const [correctId, setCorrectId] = useState<string | null>(null);
  const [correctText, setCorrectText] = useState('');

  const kind = DECK_KINDS[kindIdx];
  const isQuiz = kind.mode === 'quiz';

  const createTheDeck = async () => {
    if (!title.trim()) return toast.error('Give the deck a title');
    try {
      const id = await createDeck.mutateAsync({
        kind: kind.kind,
        mode: kind.mode,
        title: title.trim(),
      });
      setDeckId(id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed');
    }
  };

  const resetCard = () => {
    setText('');
    setImageBlob(null);
    setAudioBlob(null);
    setOptions([]);
    setCorrectId(null);
    setCorrectText('');
  };

  const addTheCard = async () => {
    if (!deckId) return;
    if (!text.trim() && !imageBlob && !audioBlob && options.length === 0) {
      return toast.error('Add a prompt or options');
    }
    const correct = isQuiz
      ? options.length
        ? { optionId: correctId }
        : { text: correctText.trim() }
      : undefined;
    try {
      await addCard.mutateAsync({
        deckId,
        position: count,
        text: text.trim() || undefined,
        options: options.length
          ? options.filter((o) => o.label.trim())
          : undefined,
        imageBlob,
        audioBlob,
        correct,
      });
      setCount((c) => c + 1);
      resetCard();
      toast.success('Card added');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed');
    }
  };

  if (!deckId) {
    return (
      <div className="space-y-6">
        <p className="eyebrow text-copper before:bg-copper after:bg-copper">
          Stage a New Deck
        </p>
        <Field label="Type">
          <Select
            value={kindIdx}
            onChange={(e) => setKindIdx(Number(e.target.value))}
          >
            {DECK_KINDS.map((k, i) => (
              <option key={k.kind} value={i}>
                {k.emoji} {k.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Title">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="How well do you know me?"
          />
        </Field>
        <Button
          full
          onClick={() => void createTheDeck()}
          disabled={createDeck.isPending}
        >
          Create & add cards
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="gilt-hairline-flat flex items-center gap-3 rounded-none bg-surface-2 p-4 shadow-catch">
        <span className="text-2xl">{kind.emoji}</span>
        <span className="font-display text-lg font-medium tracking-tight text-fg">
          {kind.label}
        </span>
        <span className="ml-auto font-sans text-xs uppercase tracking-[0.16em] text-copper tabular-nums">
          {count} card{count === 1 ? '' : 's'}
        </span>
      </div>

      <Field label="Prompt / question">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type the question…"
        />
      </Field>

      <Field label="Image (optional)">
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="block w-full font-sans text-sm text-muted file:mr-4 file:rounded-none file:border file:border-border file:bg-surface-2 file:px-4 file:py-2 file:font-sans file:text-xs file:font-semibold file:uppercase file:tracking-[0.12em] file:text-gold"
          onChange={(e) => setImageBlob(e.target.files?.[0] ?? null)}
        />
      </Field>

      <Field label="Audio (optional)">
        <AudioRecorder onRecorded={setAudioBlob} />
      </Field>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-sans text-xs font-semibold uppercase tracking-[0.18em] text-gold">
            Options
          </span>
          <Button
            size="sm"
            variant="secondary"
            onClick={() =>
              setOptions((o) => [...o, { id: nanoid(4), label: '' }])
            }
          >
            <Plus size={14} /> Option
          </Button>
        </div>
        {options.map((o) => (
          <div key={o.id} className="flex items-center gap-3">
            {isQuiz && (
              <input
                type="radio"
                name="correct"
                checked={correctId === o.id}
                onChange={() => setCorrectId(o.id)}
                aria-label="Mark correct"
                className="h-4 w-4 shrink-0 accent-copper"
              />
            )}
            <Input
              value={o.label}
              placeholder="Option text"
              onChange={(e) =>
                setOptions((opts) =>
                  opts.map((x) =>
                    x.id === o.id ? { ...x, label: e.target.value } : x
                  )
                )
              }
            />
            <button
              type="button"
              aria-label="Remove option"
              onClick={() =>
                setOptions((opts) => opts.filter((x) => x.id !== o.id))
              }
              className="lift-press shrink-0 text-muted transition-colors hover:text-danger"
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>

      {isQuiz && options.length === 0 && (
        <Field label="Correct answer (free text)">
          <Input
            value={correctText}
            onChange={(e) => setCorrectText(e.target.value)}
          />
        </Field>
      )}

      <div className="flex gap-2">
        <Button
          full
          onClick={() => void addTheCard()}
          disabled={addCard.isPending}
        >
          Add card
        </Button>
        <Button variant="secondary" onClick={onDone}>
          Done
        </Button>
      </div>
    </div>
  );
}
