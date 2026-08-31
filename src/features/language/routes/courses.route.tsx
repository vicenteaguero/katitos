import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { BookMarked, ChevronRight, Plus, Type } from 'lucide-react';
import { useTableSync } from '@kernel/realtime';
import { qk } from '@kernel/query';
import {
  Button,
  Empty,
  Field,
  FieldRow,
  Fieldset,
  Input,
  Segmented,
  Sheet,
  Textarea,
  useTopBarAction,
} from '@kernel/ui';
import { useCourses } from '../api/courses.queries';
import { useCreateCourse } from '../api/lessons.mutations';
import { useLanguages } from '../lib/languages';
import { StudyBanner } from '../components/study-banner';
import { WrongList } from '../components/wrong-list';
import {
  LANG_FLAGS,
  LANG_NATIVE_LABELS,
  type Course,
  type Lang,
} from '../types';

/**
 * The way in: what you are learning, what you teach, and today's practice.
 *
 * There are two languages in this house, not one with a gloss. She teaches him
 * Russian and he teaches her Spanish, so the screen is split by which side of a
 * course you are on rather than by a language switch — the app already knows
 * which is which from `native_language` and `learning_language`, and asking
 * again would only be a way to get it wrong.
 */
export function CoursesRoute() {
  const { data: courses } = useCourses();
  const create = useCreateCourse();
  const navigate = useNavigate();
  const { native, learning } = useLanguages();
  useTableSync('lang_courses', qk.lang.courses());

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', emoji: '', description: '' });
  // You teach your own language, so that is where the picker starts.
  const [lang, setLang] = useState<Lang>(native);

  useTopBarAction(
    <button
      type="button"
      onClick={() => {
        setLang(native);
        setOpen(true);
      }}
      aria-label="New course"
      className="lift-press flex h-8 w-8 items-center justify-center rounded-full bg-accent text-accent-fg shadow-loge"
      style={{ border: '1px solid rgba(228,195,106,.4)' }}
    >
      <Plus className="h-4 w-4" />
    </button>,
    [native]
  );

  const submit = () => {
    if (!form.title.trim()) return;
    create.mutate(
      {
        title: form.title,
        targetLang: lang,
        emoji: form.emoji || LANG_FLAGS[lang],
        description: form.description || null,
      },
      {
        onSuccess: (id) => {
          setOpen(false);
          setForm({ title: '', emoji: '', description: '' });
          navigate(`/language/course/${id}`);
        },
      }
    );
  };

  const list = courses ?? [];
  const mine = list.filter((c) => c.target_lang === learning);
  const theirs = list.filter((c) => c.target_lang === native);
  // A course in some third language still has to be reachable.
  const other = list.filter(
    (c) => c.target_lang !== learning && c.target_lang !== native
  );

  return (
    <div className="curtain-reveal space-y-3">
      <StudyBanner />

      <div className="flex gap-2">
        {/* The alphabet is Cyrillic: for the one learning it — and for the one
            who records the letters in her own voice, which is the point of the
            screen. Gating it on "learning Russian" hid it from her entirely. */}
        {(learning === 'ru' || native === 'ru') && (
          <Link to="/language/alphabet" className="flex-1">
            <Button full variant="secondary">
              <Type size={15} /> Alphabet
            </Button>
          </Link>
        )}
        <Link to="/language/dictionary" className="flex-1">
          <Button full variant="secondary">
            <BookMarked size={15} /> Dictionary
          </Button>
        </Link>
      </div>

      {list.length === 0 ? (
        <Empty
          icon="📚"
          title="No courses yet"
          hint="Build the first one — a unit, a lesson, and something to try."
          action={<Button onClick={() => setOpen(true)}>Start a course</Button>}
        />
      ) : (
        <>
          <Section
            title={LANG_NATIVE_LABELS[learning]}
            note="you're learning"
            courses={mine}
          />
          <Section
            title={LANG_NATIVE_LABELS[native]}
            note="you teach"
            courses={theirs}
          />
          <Section title="Also" courses={other} />
        </>
      )}

      <WrongList />

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="New course"
        size="half"
      >
        <div className="space-y-3">
          <Fieldset label="This course teaches">
            <Segmented
              full
              value={lang}
              onChange={(v) => setLang(v as Lang)}
              options={[
                { value: 'ru', label: LANG_NATIVE_LABELS.ru },
                { value: 'es', label: LANG_NATIVE_LABELS.es },
              ]}
            />
          </Fieldset>
          <FieldRow className="[&>*:first-child]:max-w-[4.5rem]">
            <Field label="Emoji">
              <Input
                value={form.emoji}
                onChange={(e) =>
                  setForm((f) => ({ ...f, emoji: e.target.value }))
                }
                placeholder={LANG_FLAGS[lang]}
              />
            </Field>
            <Field label="Called">
              <Input
                value={form.title}
                onChange={(e) =>
                  setForm((f) => ({ ...f, title: e.target.value }))
                }
                placeholder={
                  lang === 'ru'
                    ? 'Russian, from the beginning'
                    : 'Español, desde cero'
                }
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
            />
          </Field>
          <Button full onClick={submit} disabled={create.isPending}>
            Create
          </Button>
        </div>
      </Sheet>
    </div>
  );
}

function Section({
  title,
  note,
  courses,
}: {
  title: string;
  note?: string;
  courses: Course[];
}) {
  if (!courses.length) return null;
  return (
    <section className="space-y-1.5">
      <p className="eyebrow">
        {title}
        {note && <span className="ml-1.5 normal-case">· {note}</span>}
      </p>
      <div className="space-y-2">
        {courses.map((c) => (
          <Link
            key={c.id}
            to={`/language/course/${c.id}`}
            className="lift-press flex items-center gap-3 rounded-lg bg-surface-2 px-4 py-3"
          >
            <span className="text-2xl">
              {c.emoji ?? LANG_FLAGS[c.target_lang as Lang] ?? '📘'}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-display text-lg text-fg">
                {c.title}
              </span>
              {c.description && (
                <span className="block truncate font-sans text-xs text-muted">
                  {c.description}
                </span>
              )}
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
          </Link>
        ))}
      </div>
    </section>
  );
}
