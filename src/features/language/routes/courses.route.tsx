import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { BookMarked, ChevronRight, Plus, Type } from 'lucide-react';
import { usePartner } from '@kernel/auth';
import { useTableSync } from '@kernel/realtime';
import { qk } from '@kernel/query';
import {
  Button,
  Card,
  Desk,
  Dialog,
  Empty,
  Field,
  FieldRow,
  Fieldset,
  Input,
  ProgressBar,
  SectionLabel,
  Segmented,
  Textarea,
  TopBarButton,
  useDesk,
  useScreenChrome,
} from '@kernel/ui';
import { useCourses, useCourseSummaries } from '../api/courses.queries';
import { useAllVocab } from '../api/vocab';
import { useCreateCourse } from '../api/lessons.mutations';
import { useLanguages } from '../lib/languages';
import type { CourseSummary } from '../lib/course-summary';
import { Inbox } from '../components/inbox';
import { PracticeHero } from '../components/practice-hero';
import { LapsesLink, WrongList } from '../components/wrong-list';
import { ActionGrid, ActionTile } from '../components/kit';
import {
  LANG_FLAGS,
  LANG_NATIVE_LABELS,
  type Course,
  type Lang,
} from '../types';

/**
 * The way in: today's practice, what is waiting for your pen, both
 * courses with how far along they are, the two tools, and what keeps going
 * wrong.
 *
 * There are two languages in this house, not one with a gloss. She teaches
 * him Russian and he teaches her Spanish, so the screen is split by which
 * side of a course you are on rather than by a language switch - the app
 * already knows which is which from `native_language` and
 * `learning_language`, and asking again would only be a way to get it wrong.
 */
export function CoursesRoute() {
  const { data: courses } = useCourses();
  const summaries = useCourseSummaries();
  const create = useCreateCourse();
  const navigate = useNavigate();
  const { native, learning } = useLanguages();
  const { partner } = usePartner();
  const { data: words } = useAllVocab(learning);
  useTableSync('lang_courses', qk.lang.courses());
  // His hand-ins land in the inbox while she is looking at it.
  useTableSync('lang_lesson_progress', qk.lang.progress());
  useDesk();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', emoji: '', description: '' });
  // You teach your own language, so that is where the picker starts.
  const [lang, setLang] = useState<Lang>(native);

  useScreenChrome(
    {
      title: 'Language',
      stage: 'house',
      action: (
        <TopBarButton
          label="New course"
          onClick={() => {
            setLang(native);
            setOpen(true);
          }}
        >
          <Plus className="h-[18px] w-[18px]" />
        </TopBarButton>
      ),
    },
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
  const name = partner?.display_name ?? 'your love';

  return (
    <Desk narrow>
      <div className="curtain-reveal space-y-5 pb-2">
        <PracticeHero />
        <Inbox />

        {list.length === 0 ? (
          <Empty
            icon="📚"
            title="No courses yet"
            hint="Build the first one: a unit, a lesson, and something to try."
            action={
              <Button onClick={() => setOpen(true)}>Start a course</Button>
            }
          />
        ) : (
          <>
            <Section
              label={`${LANG_NATIVE_LABELS[learning]}, you're learning`}
              note={`${name}'s course for you`}
              courses={mine}
              summaries={summaries}
              teaching={false}
            />
            <Section
              label={`${LANG_NATIVE_LABELS[native]}, you teach`}
              note={`${name}'s lessons, your pen`}
              courses={theirs}
              summaries={summaries}
              teaching
            />
            <Section
              label="Also"
              courses={other}
              summaries={summaries}
              teaching={false}
            />
          </>
        )}

        <ActionGrid cols={2}>
          {/* The alphabet is Cyrillic: for the one learning it - and for the
            one who records the letters in her own voice, which is the point
            of the screen. Gating it on "learning Russian" hid it from her
            entirely. */}
          {(learning === 'ru' || native === 'ru') && (
            <ActionTile
              row
              to="/language/alphabet"
              icon={<Type className="h-4 w-4" />}
              label="Alphabet"
            />
          )}
          <ActionTile
            row
            to="/language/dictionary"
            icon={<BookMarked className="h-4 w-4" />}
            label="Dictionary"
            note={words ? `${words.length} words` : undefined}
          />
        </ActionGrid>

        <WrongList />
        <LapsesLink />

        <Dialog
          placement="auto"
          open={open}
          onClose={() => setOpen(false)}
          title="New course"
          size="md"
        >
          <div className="space-y-3">
            <Fieldset label="This course teaches">
              <Segmented
                full
                shape="bar"
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
                  tone="ink"
                  value={form.emoji}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, emoji: e.target.value }))
                  }
                  placeholder={LANG_FLAGS[lang]}
                />
              </Field>
              <Field label="Called">
                <Input
                  tone="ink"
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
                tone="ink"
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
        </Dialog>
      </div>
    </Desk>
  );
}

function Section({
  label,
  note,
  courses,
  summaries,
  teaching,
}: {
  label: string;
  note?: string;
  courses: Course[];
  summaries: Map<string, CourseSummary> | undefined;
  /** This is the side of the course where I hold the pen. */
  teaching: boolean;
}) {
  if (!courses.length) return null;
  return (
    <section>
      <SectionLabel note={note}>{label}</SectionLabel>
      <div className="space-y-2">
        {courses.map((c) => (
          <CourseCard
            key={c.id}
            course={c}
            summary={summaries?.get(c.id)}
            teaching={teaching}
          />
        ))}
      </div>
    </section>
  );
}

/** What the line under a course title says, on each side of it. */
function summaryLine(s: CourseSummary | undefined, teaching: boolean) {
  if (!s) return null;
  if (teaching) {
    const parts = [`${s.total} ${s.total === 1 ? 'lesson' : 'lessons'}`];
    if (s.toMark) parts.push(`${s.toMark} to mark`);
    else if (s.donePartner) parts.push(`${s.donePartner} marked`);
    if (s.drafts)
      parts.push(`${s.drafts} ${s.drafts === 1 ? 'draft' : 'drafts'}`);
    return parts.join(', ');
  }
  if (s.total === 0) return 'Nothing to read yet';
  if (!s.next) return `All ${s.total} done`;
  return `Unit ${s.unitIndex} of ${s.unitCount}, next: ${s.next.title}`;
}

function CourseCard({
  course: c,
  summary: s,
  teaching,
}: {
  course: Course;
  summary: CourseSummary | undefined;
  teaching: boolean;
}) {
  const done = teaching ? s?.donePartner : s?.doneMine;
  const line = summaryLine(s, teaching) ?? c.description;
  return (
    <Link
      to={`/language/course/${c.id}`}
      className="lift-press block rounded-card outline-none focus-visible:ring-2 focus-visible:ring-gold"
    >
      <Card tone="hairline" className="space-y-2.5">
        <span className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-surface-2 text-[22px]">
            {c.emoji ?? LANG_FLAGS[c.target_lang as Lang] ?? '📘'}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-sans text-base font-extrabold text-fg">
              {c.title}
            </span>
            {line && (
              <span className="block truncate font-sans text-xs font-medium text-muted">
                {line}
              </span>
            )}
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
        </span>
        {s && s.total > 0 && (
          <ProgressBar
            value={done ?? 0}
            max={s.total}
            label={teaching ? 'Marked' : 'Done'}
          />
        )}
      </Card>
    </Link>
  );
}
