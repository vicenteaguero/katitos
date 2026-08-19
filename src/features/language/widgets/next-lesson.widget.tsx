import { Link } from 'react-router';
import { GraduationCap } from 'lucide-react';
import { Card, CardTitle } from '@kernel/ui';
import { useDueLessons } from '../api/courses.queries';
import { useLanguages } from '../lib/languages';
import { useAllVocab, useMyReviews } from '../api/vocab';
import { buildSession } from '../lib/srs';

/** "today" · "tomorrow" · "in 3 days" · "2 days late". */
function when(due: string): string {
  const days = Math.round(
    (new Date(`${due}T00:00:00`).getTime() - Date.now()) / 86_400_000
  );
  if (days === 0) return 'due today';
  if (days === 1) return 'due tomorrow';
  if (days > 1) return `due in ${days} days`;
  return `${Math.abs(days)} day${days === -1 ? '' : 's'} late`;
}

/**
 * What Russian is waiting for you, on the home screen.
 *
 * Two things only: the homework with a date on it, and how many words are due
 * — because those are the two things you can actually do something about
 * before breakfast.
 */
export function NextLessonWidget() {
  const { learning } = useLanguages();
  const { data: due } = useDueLessons(learning);
  const { data: words } = useAllVocab(learning);
  const { data: reviews } = useMyReviews();

  const session = buildSession(words ?? [], reviews ?? new Map()).length;
  const next = due?.[0];

  // Nothing to nag about — a widget with nothing in it is just clutter.
  if (!next && session === 0) return null;

  return (
    <Link to={next ? `/language/lesson/${next.id}` : '/language/study'}>
      <Card className="lift-press">
        <CardTitle>
          <span className="inline-flex items-center gap-1">
            <GraduationCap className="h-4 w-4" /> Russian
          </span>
        </CardTitle>
        {next ? (
          <>
            <p className="mt-1 truncate font-display text-lg text-fg">
              {next.title}
            </p>
            <p className="font-sans text-xs text-muted">
              {next.kind === 'exam' ? 'Exam' : 'Homework'}
              {next.due_on ? ` · ${when(next.due_on)}` : ''}
              {session > 0 ? ` · ${session} words to practise` : ''}
            </p>
          </>
        ) : (
          <>
            <p className="mt-1 font-display text-lg text-fg tabular-nums">
              {session} {session === 1 ? 'word' : 'words'}
            </p>
            <p className="font-sans text-xs text-muted">waiting for you</p>
          </>
        )}
      </Card>
    </Link>
  );
}
