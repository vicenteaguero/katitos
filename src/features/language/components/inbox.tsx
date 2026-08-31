import { Link } from 'react-router';
import { ChevronRight, ClipboardCheck } from 'lucide-react';
import { usePartnerProgress } from '../api/courses.queries';
import { useLanguages } from '../lib/languages';
import { agoLabel, dueSentence } from '../lib/due';
import { useToday } from '../lib/use-today';

/**
 * What he has handed in and she has not marked — across every course.
 *
 * The badge on a lesson row only helped if she was already in the right
 * course. A teacher's home is a to-review list; that is the thing that makes
 * it a teacher's app.
 */
export function Inbox() {
  const { native, ready } = useLanguages();
  const { data: rows } = usePartnerProgress();
  const today = useToday();
  if (!ready || !rows) return null;

  const waiting = rows
    .filter(
      (r) =>
        r.status === 'submitted' &&
        r.lesson?.unit?.course?.target_lang === native
    )
    .sort((a, b) => (a.submitted_at ?? '').localeCompare(b.submitted_at ?? ''));
  if (!waiting.length) return null;

  return (
    <section className="space-y-1.5">
      <p className="eyebrow">
        To mark
        <span className="ml-1.5 normal-case">· {waiting.length}</span>
      </p>
      <ul className="space-y-1">
        {waiting.map((r) => (
          <li key={r.lesson_id}>
            <Link
              to={`/language/mark/${r.lesson_id}`}
              className="lift-press flex items-center gap-2.5 rounded-lg bg-surface-2 px-3 py-2.5"
            >
              <ClipboardCheck className="h-4 w-4 shrink-0 text-gold" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-sans text-sm font-semibold text-fg">
                  {r.lesson?.title}
                </span>
                <span className="block font-sans text-[0.68rem] text-muted">
                  {r.submitted_at
                    ? `handed in ${agoLabel(r.submitted_at)}`
                    : 'handed in'}
                  {r.lesson?.due_on
                    ? ` · ${dueSentence(r.lesson.due_on, today)}`
                    : ''}
                </span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
