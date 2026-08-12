import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Plus, ChevronRight } from 'lucide-react';
import { useUserId } from '@kernel/auth';
import { useTableSync } from '@kernel/realtime';
import {
  Button,
  Card,
  Empty,
  Field,
  FieldRow,
  Input,
  Segmented,
  Sheet,
  Textarea,
  toast,
} from '@kernel/ui';
import { useDecks, deckKeys } from '../api/decks.queries';
import { useCreateDeck } from '../api/decks.mutations';
import { LANG_LABELS, type Lang } from '../types';
import { StudyBanner } from '../components/study-banner';
import { WrongList } from '../components/wrong-list';

/** Deck browser — "a course your love built for you", per language. */
export function DecksRoute() {
  const [lang, setLang] = useState<Lang>('ru');
  const userId = useUserId();
  useTableSync('language_decks', deckKeys.list(lang));
  const { data: decks } = useDecks(lang);
  const create = useCreateDeck();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', emoji: '', description: '' });

  const submit = () => {
    if (!form.title.trim()) return;
    create.mutate(
      {
        language: lang,
        title: form.title.trim(),
        emoji: form.emoji || null,
        description: form.description || null,
      },
      {
        onSuccess: (id) => {
          setOpen(false);
          setForm({ title: '', emoji: '', description: '' });
          navigate(`/language/deck/${id}`);
        },
        onError: (e) => toast.error(e.message),
      }
    );
  };

  const list = decks ?? [];

  return (
    <div className="curtain-reveal space-y-4">
      <Segmented
        value={lang}
        onChange={setLang}
        className="w-full"
        options={[
          { value: 'ru', label: LANG_LABELS.ru },
          { value: 'es', label: LANG_LABELS.es },
        ]}
      />

      {lang === 'ru' && <StudyBanner />}

      <Button full variant="secondary" onClick={() => setOpen(true)}>
        <Plus size={16} /> Build a deck for your love
      </Button>

      {list.length === 0 ? (
        <Empty
          icon="📚"
          title="No decks yet"
          hint="Build the first little course."
        />
      ) : (
        <div className="space-y-3">
          {list.map((d) => (
            <Link key={d.id} to={`/language/deck/${d.id}`} className="block">
              <Card className="lift-press flex items-center gap-4 px-5 py-4">
                <span className="text-3xl">{d.emoji ?? '🗂️'}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-xl text-fg">
                    {d.title}
                  </p>
                  <p className="font-sans text-xs text-muted">
                    {d.cardCount} {d.cardCount === 1 ? 'card' : 'cards'} ·{' '}
                    {d.created_by === userId ? 'yours' : 'from your love 💌'}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
              </Card>
            </Link>
          ))}
        </div>
      )}

      {lang === 'ru' && <WrongList />}

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="New deck"
        size="half"
      >
        <div className="space-y-3">
          <FieldRow className="[&>*:first-child]:max-w-[4.5rem]">
            <Field label="Emoji">
              <Input
                value={form.emoji}
                onChange={(e) =>
                  setForm((f) => ({ ...f, emoji: e.target.value }))
                }
                placeholder="🌙"
              />
            </Field>
            <Field label="Title">
              <Input
                value={form.title}
                onChange={(e) =>
                  setForm((f) => ({ ...f, title: e.target.value }))
                }
                placeholder="Sweet nothings"
              />
            </Field>
          </FieldRow>
          <Field label="About">
            <Textarea
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              rows={2}
              placeholder="The words I want you to know by heart…"
            />
          </Field>
          <Button full onClick={submit} disabled={create.isPending}>
            Create deck
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
