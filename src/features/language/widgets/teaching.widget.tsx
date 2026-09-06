import { Link } from 'react-router';
import { BookOpenCheck } from 'lucide-react';
import { Card, CardTitle } from '@kernel/ui';
import { useDueLessons, usePartnerProgress } from '../api/courses.queries';
import { useAllVocab } from '../api/vocab';
import { useLanguages } from '../lib/languages';
import { daysUntil, dueSentence } from '../lib/due';
import { useToday } from '../lib/use-today';
import { LANG_LABELS } from '../types';

/** Handed in, or marked - either way, off his plate. */
const DONE = new Set(['submitted', 'graded']);

/**
 * What the language you TEACH is waiting for, on the home screen.
 *
 * Three lines, each gone when it is zero: work to mark, homework due this
 * week that he has not handed in, and words with no recording of you yet.
 * Her side of the loop - the other widget is his.
 */
export function TeachingWidget() {
  const { native, ready } = useLanguages();
  const { data: rows } = usePartnerProgress();
  const { data: due } = useDueLessons(native);
  const { data: words } = useAllVocab(native);
  const today = useToday();
  if (!ready || !rows || !due || !words) return null;

  const toMark = rows
    .filter(
      (r) =>
        r.status === 'submitted' &&
        r.lesson?.unit?.course?.target_lang === native
    )
    .sort((a, b) => (a.submitted_at ?? '').localeCompare(b.submitted_at ?? ''));
  const done = new Set(
    rows.filter((r) => DONE.has(r.status)).map((r) => r.lesson_id)
  );
  const thisWeek = due.filter(
    (l) => !done.has(l.id) && l.due_on && daysUntil(l.due_on, today) <= 7
  );
  const silent = words.filter((w) => !w.audio_path).length;
  if (!toMark.length && !thisWeek.length && !silent) return null;

  return (
    <Card>
      <CardTitle>
        <span className="inline-flex items-center gap-1">
          <BookOpenCheck className="h-4 w-4" /> Teaching {LANG_LABELS[native]}
        </span>
      </CardTitle>
      <ul className="mt-1 space-y-1">
        {toMark.length > 0 && (
          <Row
            to={`/language/mark/${toMark[0].lesson_id}`}
            lead={`${toMark.length} to mark`}
            note={toMark[0].lesson?.title ?? ''}
          />
        )}
        {thisWeek.length > 0 && (
          <Row
            to={`/language/lesson/${thisWeek[0].id}`}
            lead={`${thisWeek.length} due this week`}
            note={`${thisWeek[0].title} - ${dueSentence(thisWeek[0].due_on!, today)}`}
          />
        )}
        {silent > 0 && (
          <Row
            to="/language/dictionary"
            lead={`${silent} silent ${silent === 1 ? 'word' : 'words'}`}
            note="no recording of you yet"
          />
        )}
      </ul>
    </Card>
  );
}

function Row({ to, lead, note }: { to: string; lead: string; note: string }) {
  return (
    <li>
      <Link to={to} className="lift-press flex items-baseline gap-2">
        <span className="shrink-0 font-display text-lg text-fg tabular-nums">
          {lead}
        </span>
        <span className="min-w-0 truncate font-sans text-xs text-muted">
          {note}
        </span>
      </Link>
    </li>
  );
}
