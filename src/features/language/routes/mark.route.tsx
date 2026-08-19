import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Check, X } from 'lucide-react';
import { usePartner } from '@kernel/auth';
import { cn } from '@kernel/lib';
import {
  Button,
  Empty,
  Field,
  Input,
  LoadingScreen,
  Textarea,
  toast,
} from '@kernel/ui';
import { useProgress } from '../api/courses.queries';
import { useAttemptsForMarking, useLesson } from '../api/lessons.queries';
import { useSaveProgress } from '../api/lessons.mutations';
import { useLanguages } from '../lib/languages';
import { acceptedForms } from '../lib/exercise-schema';
import { pick } from '../lib/pick';
import type { Attempt } from '../types';

/** What he actually typed or picked, in a form worth reading. */
function shown(answer: unknown): string {
  if (answer === null || answer === undefined) return '—';
  if (typeof answer === 'boolean') return answer ? 'said it' : 'not yet';
  if (Array.isArray(answer)) return answer.join(' · ');
  if (typeof answer === 'object') {
    return Object.entries(answer as Record<string, string>)
      .map(([l, r]) => `${l} → ${r}`)
      .join(' · ');
  }
  return String(answer);
}

/**
 * Marking his work.
 *
 * The app can say whether an answer matched; it cannot say whether he has
 * understood, and it certainly cannot write him a note. She asked for EdVibe,
 * and the thing that makes a teaching tool a teaching tool is that the teacher
 * reads what came back — so everything here is her seeing HIS answers, not the
 * app's verdict on them.
 */
export function MarkRoute() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const { data: lesson, isLoading } = useLesson(lessonId);
  const { data: attempts } = useAttemptsForMarking(lessonId);
  const { data: progress } = useProgress();
  const { partner } = usePartner();
  const saveProgress = useSaveProgress();
  const { native: support } = useLanguages();
  const navigate = useNavigate();

  const [score, setScore] = useState('');
  const [note, setNote] = useState('');

  /** His newest answer per question — attempts are append-only. */
  const his = useMemo(() => {
    const out = new Map<string, Attempt>();
    for (const a of attempts ?? []) {
      if (a.user_id === partner?.user_id && !out.has(a.exercise_id)) {
        out.set(a.exercise_id, a);
      }
    }
    return out;
  }, [attempts, partner?.user_id]);

  const hisProgress = (progress ?? []).find(
    (p) => p.lesson_id === lessonId && p.user_id === partner?.user_id
  );

  // Start from what the app worked out, so she is correcting rather than
  // counting.
  useEffect(() => {
    setNote(hisProgress?.teacher_note ?? '');
    const auto = hisProgress?.score;
    setScore(auto != null ? String(Math.round(auto * 100)) : '');
  }, [hisProgress?.teacher_note, hisProgress?.score]);

  if (isLoading) return <LoadingScreen />;
  if (!lesson) return <Empty icon="📄" title="No such lesson" />;

  const answered = lesson.exercises.filter((ex) => his.has(ex.id));

  if (!answered.length) {
    return (
      <Empty
        icon="⏳"
        title="Nothing to mark yet"
        hint={`${partner?.display_name ?? 'He'} hasn't answered this one.`}
      />
    );
  }

  const right = answered.filter((ex) => his.get(ex.id)?.correct).length;

  return (
    <div className="curtain-reveal space-y-3">
      <header className="min-w-0">
        <p className="eyebrow">
          {partner?.display_name ?? 'His'} answers · {right} of{' '}
          {answered.length} right
        </p>
        <h1 className="mt-0.5 truncate font-display text-2xl font-semibold text-fg">
          {lesson.title}
        </h1>
      </header>

      <ul className="space-y-2">
        {answered.map((ex, i) => {
          const attempt = his.get(ex.id);
          const ok = attempt?.correct;
          return (
            <li
              key={ex.id}
              className={cn(
                'space-y-1 rounded-lg px-3 py-2.5',
                ok ? 'bg-surface' : 'bg-danger/10'
              )}
            >
              <p className="flex items-center gap-1.5 font-sans text-[0.68rem] uppercase tracking-[0.12em] text-muted">
                {ok ? (
                  <Check className="h-3.5 w-3.5 text-success" />
                ) : (
                  <X className="h-3.5 w-3.5 text-danger" />
                )}
                {i + 1} · {ex.kind}
                {attempt && attempt.attempt_no > 1 && (
                  <span className="text-copper">
                    {attempt.attempt_no} tries
                  </span>
                )}
              </p>
              <p className="font-sans text-sm text-fg">
                {pick(ex, 'prompt', support) || 'Untitled question'}
              </p>
              <p className="font-display text-base text-fg">
                {shown(attempt?.answer)}
              </p>
              {!ok && (
                <p className="font-sans text-xs text-muted">
                  wanted: {acceptedForms(ex.answer).join(' · ') || '—'}
                </p>
              )}
            </li>
          );
        })}
      </ul>

      <Field label="Out of a hundred" hint="Change it if the app was unfair">
        <Input
          value={score}
          onChange={(e) => setScore(e.target.value.replace(/[^\d]/g, ''))}
          inputMode="numeric"
          placeholder="90"
        />
      </Field>

      <Field label="A note for him" hint="The part the app cannot do">
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="почти! watch the ending on the second one"
        />
      </Field>

      <Button
        full
        disabled={saveProgress.isPending || !partner}
        onClick={() =>
          partner &&
          saveProgress.mutate(
            {
              lessonId: lesson.id,
              forUserId: partner.user_id,
              status: 'graded',
              score: score ? Number(score) / 100 : null,
              teacherNote: note.trim() || null,
            },
            {
              onSuccess: () => {
                toast.success('Marked');
                navigate(-1);
              },
            }
          )
        }
      >
        Give it back to him
      </Button>
    </div>
  );
}
