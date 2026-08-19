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
  Input,
  Segmented,
  Sheet,
  Textarea,
  useTopBarAction,
} from '@kernel/ui';
import { useCourses } from '../api/courses.queries';
import { useCreateCourse } from '../api/lessons.mutations';
import { useLangPrefs } from '../lib/lang-prefs';
import { StudyBanner } from '../components/study-banner';
import { WrongList } from '../components/wrong-list';
import { SUPPORT_LABELS, type SupportLang } from '../types';

/**
 * The way in: her courses, today's practice, and what he keeps forgetting.
 *
 * The controls that used to eat the top of this screen — a language switch and
 * a full-width "build a deck" button — are in the top bar now, which gives the
 * courses themselves the first thing you see.
 */
export function CoursesRoute() {
  const { data: courses } = useCourses();
  const create = useCreateCourse();
  const navigate = useNavigate();
  const support = useLangPrefs((s) => s.supportLang);
  const setSupport = useLangPrefs((s) => s.setSupport);
  useTableSync('lang_courses', qk.lang.courses());

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', emoji: '', description: '' });

  useTopBarAction(
    <div className="flex items-center gap-1.5">
      <Segmented
        value={support}
        onChange={(v) => setSupport(v as SupportLang)}
        options={[
          { value: 'en', label: 'EN' },
          { value: 'es', label: 'ES' },
        ]}
      />
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="New course"
        className="lift-press flex h-8 w-8 items-center justify-center rounded-full bg-accent text-accent-fg shadow-loge"
        style={{ border: '1px solid rgba(228,195,106,.4)' }}
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>,
    [support]
  );

  const submit = () => {
    if (!form.title.trim()) return;
    create.mutate(
      {
        title: form.title,
        targetLang: 'ru',
        emoji: form.emoji || null,
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

  return (
    <div className="curtain-reveal space-y-3">
      <StudyBanner />

      <div className="flex gap-2">
        <Link to="/language/alphabet" className="flex-1">
          <Button full variant="secondary">
            <Type size={15} /> Alphabet
          </Button>
        </Link>
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
        <div className="space-y-2">
          {list.map((c) => (
            <Link
              key={c.id}
              to={`/language/course/${c.id}`}
              className="lift-press flex items-center gap-3 rounded-lg bg-surface-2 px-4 py-3"
            >
              <span className="text-2xl">{c.emoji ?? '📘'}</span>
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
      )}

      <WrongList />

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="New course"
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
                placeholder="🇷🇺"
              />
            </Field>
            <Field label="Called">
              <Input
                value={form.title}
                onChange={(e) =>
                  setForm((f) => ({ ...f, title: e.target.value }))
                }
                placeholder="Russian, from the beginning"
              />
            </Field>
          </FieldRow>
          <Field label="About" hint={`Shown in ${SUPPORT_LABELS[support]}`}>
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
