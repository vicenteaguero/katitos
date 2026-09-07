import { Link } from 'react-router';
import { ChevronRight, ClipboardCheck } from 'lucide-react';
import { usePartner } from '@kernel/auth';
import { Card, CardRows, SectionLabel } from '@kernel/ui';
import { usePartnerProgress } from '../api/courses.queries';
import { useLanguages } from '../lib/languages';
import { agoLabel, daysUntil } from '../lib/due';
import { useToday } from '../lib/use-today';

/**
 * What he has handed in and she has not marked - across every course.
 *
 * The badge on a lesson row only helped if she was already in the right
 * course. A teacher's home is a to-review list; that is the thing that makes
 * it a teacher's app.
 */
export function Inbox() {
  const { native, ready } = useLanguages();
  const { partner } = usePartner();
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

  const name = partner?.display_name ?? 'Your love';

  return (
    <section>
      <SectionLabel note={`${waiting.length} waiting`}>To mark</SectionLabel>
      <Card tone="hairline" className="p-0">
        <CardRows>
          {waiting.map((r) => {
            const late = r.lesson?.due_on
              ? daysUntil(r.lesson.due_on, today) <= 0
              : false;
            return (
              <Link
                key={r.lesson_id}
                to={`/language/mark/${r.lesson_id}`}
                className="lift-press flex items-center gap-3 px-3.5 py-2.5 outline-none focus-visible:ring-2 focus-visible:ring-gold"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-surface-2 text-gold">
                  <ClipboardCheck className="h-[18px] w-[18px]" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-sans text-[15px] font-bold text-fg">
                    {r.lesson?.title}
                  </span>
                  <span className="block font-sans text-xs font-medium text-muted">
                    {name},{' '}
                    {r.submitted_at
                      ? `handed in ${agoLabel(r.submitted_at)}`
                      : 'handed in'}
                  </span>
                </span>
                {late && (
                  <span className="shrink-0 rounded-full bg-danger/[0.18] px-2 py-0.5 font-sans text-[10px] font-bold uppercase tracking-[0.06em] text-[#e0919b]">
                    Due
                  </span>
                )}
                <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
              </Link>
            );
          })}
        </CardRows>
      </Card>
    </section>
  );
}
