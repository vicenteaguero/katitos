import { Link } from 'react-router';
import { GraduationCap } from 'lucide-react';
import { Card, CardTitle } from '@kernel/ui';
import { useDueLessons, useMyProgress } from '../api/courses.queries';
import { useLanguages } from '../lib/languages';
import { useAllVocab, useMyReviews } from '../api/vocab';
import { buildSession } from '../lib/srs';
import { dueLabel } from '../lib/due';
import { LANG_LABELS } from '../types';

/** "due today" · "due tomorrow" · "due in 3 days" · "2 days late". */
function when(due: string): string {
  const label = dueLabel(due);
  return label.endsWith('late') ? label : `due ${label}`;
}

/** Handed in, or marked — either way, no longer waiting for him. */
const DONE = new Set(['submitted', 'graded']);

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
  const { data: progress } = useMyProgress();

  // Only once BOTH halves are here. The reviews arrive after the words, and
  // in that gap every word looked due — "20 words waiting" flashed up and
  // then snapped to the real number, or the card appeared and vanished.
  if (!words || !reviews || !due) return null;

  const session = buildSession(words, reviews).length;
  // The first piece of homework he has NOT handed in. The oldest due one was
  // shown forever, marked or not — "it sits on the home screen getting later".
  const next = due.find((l) => !DONE.has(progress?.get(l.id)?.status ?? ''));

  // Nothing to nag about — a widget with nothing in it is just clutter.
  if (!next && session === 0) return null;

  return (
    <Link to={next ? `/language/lesson/${next.id}` : '/language/study'}>
      <Card className="lift-press">
        <CardTitle>
          <span className="inline-flex items-center gap-1">
            <GraduationCap className="h-4 w-4" /> {LANG_LABELS[learning]}
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
