import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { ClipboardPaste, Pencil, Play, Plus, Trash2 } from 'lucide-react';
import { BUCKETS } from '@kernel/storage';
import { useTableSync } from '@kernel/realtime';
import {
  AudioRecorder,
  PlayButton,
  type AudioClip,
  Button,
  Card,
  Empty,
  Field,
  FieldRow,
  IconButton,
  Input,
  LoadingScreen,
  Sheet,
  Textarea,
  toast,
} from '@kernel/ui';
import { useDeck, useDeckCards, deckKeys } from '../api/decks.queries';
import {
  useAddCard,
  useBulkAddCards,
  useDeleteCard,
  useUpdateCard,
} from '../api/decks.mutations';
import { LANG_LABELS, type Lang } from '../types';

export function DeckRoute() {
  const { deckId } = useParams<{ deckId: string }>();
  const { data: deck, isLoading } = useDeck(deckId);
  useTableSync('phrases', deckKeys.cards(deckId ?? 'none'));
  const { data: cards } = useDeckCards(deckId);
  const addCard = useAddCard();
  const bulkAdd = useBulkAddCards();
  const updateCard = useUpdateCard();
  const delCard = useDeleteCard();

  const [open, setOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    text: '',
    translation: '',
    transliteration: '',
    notes: '',
  });
  const [form, setForm] = useState({
    text: '',
    translation: '',
    transliteration: '',
    example: '',
  });
  const [audio, setAudio] = useState<AudioClip | null>(null);

  if (isLoading) return <LoadingScreen />;
  if (!deck) return <Empty icon="🗂️" title="Deck not found" />;

  const lang = deck.language as Lang;
  const list = cards ?? [];

  const submit = () => {
    if (!form.text.trim()) return;
    addCard.mutate(
      {
        deckId: deck.id,
        language: lang,
        text: form.text.trim(),
        translation: form.translation || undefined,
        transliteration: form.transliteration || undefined,
        example: form.example || undefined,
        audio,
      },
      {
        onSuccess: () => {
          setForm({
            text: '',
            translation: '',
            transliteration: '',
            example: '',
          });
          setAudio(null);
          setOpen(false);
        },
        onError: (e) => toast.error(e.message),
      }
    );
  };

  return (
    <div className="curtain-reveal space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="eyebrow">{deck.description ?? 'A little course'}</p>
          <h1 className="mt-1 truncate font-display text-3xl font-semibold tracking-tight text-fg">
            <span className="mr-2">{deck.emoji ?? '🗂️'}</span>
            {deck.title}
          </h1>
        </div>
      </header>

      <div className="flex gap-2">
        <Button full variant="secondary" onClick={() => setOpen(true)}>
          <Plus size={16} /> Add card
        </Button>
        <Button variant="secondary" onClick={() => setBulkOpen(true)}>
          <ClipboardPaste size={16} />
        </Button>
        {list.length > 0 && (
          <Link to={`/language/play/${deck.id}`} className="flex-1">
            <Button full>
              <Play size={16} /> Practice
            </Button>
          </Link>
        )}
      </div>

      {list.length === 0 ? (
        <Empty
          icon="📝"
          title="No cards yet"
          hint="Add the first word or phrase."
        />
      ) : (
        <div className="space-y-3">
          {list.map((p) => (
            <Card key={p.id} className="space-y-2 px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-display text-2xl text-fg">{p.text}</p>
                  {p.transliteration && (
                    <p className="font-display text-sm italic text-copper">
                      {p.transliteration}
                    </p>
                  )}
                  {p.translation && (
                    <p className="mt-1 font-sans text-sm text-muted">
                      {p.translation}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center">
                  <IconButton
                    label="Edit"
                    onClick={() => {
                      setEditingId(p.id);
                      setEditForm({
                        text: p.text,
                        translation: p.translation ?? '',
                        transliteration: p.transliteration ?? '',
                        notes: p.notes ?? '',
                      });
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </IconButton>
                  <IconButton
                    label="Delete"
                    onClick={() =>
                      delCard.mutate({ id: p.id, deckId: deck.id })
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </IconButton>
                </div>
              </div>
              {p.audio_path && (
                <PlayButton
                  bucket={BUCKETS.languageAudio}
                  path={p.audio_path}
                  size="sm"
                />
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Paste a whole lesson at once — typing thirty cards one at a time
          through a sheet is not something anyone does twice. */}
      <Sheet
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        title="Paste a lesson"
        size="half"
      >
        <div className="space-y-3">
          <Field
            label="One card per line"
            hint="russian | meaning | sounds-like — the last two optional."
          >
            <Textarea
              autoFocus
              rows={8}
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              placeholder={'привет | hello | privyet\nпока | bye | paka'}
            />
          </Field>
          <Button
            full
            disabled={!bulkText.trim() || bulkAdd.isPending}
            onClick={() =>
              bulkAdd.mutate(
                { deckId: deck.id, language: lang, raw: bulkText },
                {
                  onSuccess: (n) => {
                    toast.success(`${n} cards added 📚`);
                    setBulkText('');
                    setBulkOpen(false);
                  },
                }
              )
            }
          >
            Add them all
          </Button>
        </div>
      </Sheet>

      {/* Fixing a typo used to mean deleting the card — and every review of
          it. Now it's just an edit. */}
      <Sheet
        open={!!editingId}
        onClose={() => setEditingId(null)}
        title="Edit this card"
      >
        <div className="space-y-3">
          <Field label={`In ${LANG_LABELS[lang]}`}>
            <Input
              value={editForm.text}
              onChange={(e) =>
                setEditForm((f) => ({ ...f, text: e.target.value }))
              }
              className="font-display text-lg"
            />
          </Field>
          <FieldRow>
            <Field label="Meaning">
              <Input
                value={editForm.translation}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, translation: e.target.value }))
                }
              />
            </Field>
            <Field label="Sounds like">
              <Input
                value={editForm.transliteration}
                onChange={(e) =>
                  setEditForm((f) => ({
                    ...f,
                    transliteration: e.target.value,
                  }))
                }
              />
            </Field>
          </FieldRow>
          <Field label="Teaching note">
            <Textarea
              rows={2}
              value={editForm.notes}
              onChange={(e) =>
                setEditForm((f) => ({ ...f, notes: e.target.value }))
              }
              placeholder="grammar, stress, a warning…"
            />
          </Field>
          <Button
            full
            disabled={!editForm.text.trim() || updateCard.isPending}
            onClick={() =>
              editingId &&
              updateCard.mutate(
                {
                  id: editingId,
                  deckId: deck.id,
                  text: editForm.text.trim(),
                  translation: editForm.translation.trim() || null,
                  transliteration: editForm.transliteration.trim() || null,
                  notes: editForm.notes.trim() || null,
                },
                {
                  onSuccess: () => {
                    toast.success('Saved');
                    setEditingId(null);
                  },
                }
              )
            }
          >
            Save
          </Button>
        </div>
      </Sheet>

      <Sheet open={open} onClose={() => setOpen(false)} title="Add a card">
        <div className="space-y-3">
          <Field label={`In ${LANG_LABELS[lang]}`}>
            <Input
              value={form.text}
              onChange={(e) => setForm((f) => ({ ...f, text: e.target.value }))}
              className="font-display text-lg"
              placeholder={{ ru: 'Я тебя люблю', es: 'Te amo' }[lang]}
            />
          </Field>
          <FieldRow>
            <Field label="Meaning">
              <Input
                value={form.translation}
                onChange={(e) =>
                  setForm((f) => ({ ...f, translation: e.target.value }))
                }
                placeholder="I love you"
              />
            </Field>
            <Field label="Sounds like">
              <Input
                value={form.transliteration}
                onChange={(e) =>
                  setForm((f) => ({ ...f, transliteration: e.target.value }))
                }
                placeholder="ya tebya…"
              />
            </Field>
          </FieldRow>
          <Field
            label="A teaching note (optional)"
            hint="Grammar, a case, where the stress falls — shown with the answer."
          >
            <Input
              value={form.example}
              onChange={(e) =>
                setForm((f) => ({ ...f, example: e.target.value }))
              }
              placeholder="accusative after «люблю»"
            />
          </Field>
          <Field label="Say it out loud (optional)">
            <AudioRecorder onRecorded={setAudio} />
          </Field>
          <Button full onClick={submit} disabled={addCard.isPending}>
            Add card
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
