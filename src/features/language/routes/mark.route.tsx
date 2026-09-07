import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { DateTime } from 'luxon';
import { nanoid } from 'nanoid';
import {
  Check,
  ChevronRight,
  MessageSquare,
  Mic,
  RotateCcw,
  Send,
  X,
} from 'lucide-react';
import { usePartner } from '@kernel/auth';
import { useHotkeys } from '@kernel/hooks';
import { useTableSync } from '@kernel/realtime';
import { qk } from '@kernel/query';
import { cn } from '@kernel/lib';
import { supabase } from '@kernel/supabase';
import { BUCKETS, storagePaths, useUpload } from '@kernel/storage';
import {
  AudioRecorder,
  Button,
  Card,
  Desk,
  Dialog,
  Empty,
  Input,
  Kbd,
  ListSkeleton,
  PlayButton,
  SectionLabel,
  StickyFooter,
  Textarea,
  toast,
  TopBarPill,
  useDesk,
  useIsDesk,
  useScreenChrome,
  type AudioClip,
} from '@kernel/ui';
import { usePartnerProgress } from '../api/courses.queries';
import { useAttemptsForMarking, useLesson } from '../api/lessons.queries';
import { useMarkAttempt, useSaveProgress } from '../api/lessons.mutations';
import { useLanguages } from '../lib/languages';
import { speakAnswer, type ExerciseOption } from '../lib/exercise-schema';
import { answerText } from '../lib/answer-text';
import { exerciseKindLabel } from '../lib/exercise-kinds';
import { verdictOf, weightedScore } from '../lib/marking';
import { clockIn, isAsleep } from '../lib/quiet';
import { pick } from '../lib/pick';
import {
  ExerciseCard,
  MarginNote,
  MarginNoteEditor,
  QuietNote,
} from '../components/kit';
import type { Attempt, Exercise, Lang } from '../types';

/** What he actually typed or picked, in a form worth reading. */
function shown(ex: Exercise, answer: unknown, target: Lang): string {
  if (answer === null || answer === undefined) return '-';
  // A picked option is an id; say the option.
  const options = (ex.payload as { options?: ExerciseOption[] } | null)
    ?.options;
  if (options && (ex.kind === 'choice' || ex.kind === 'multi')) {
    const ids = Array.isArray(answer) ? (answer as string[]) : [answer];
    const label = (id: unknown) => {
      const o = options.find((x) => x.id === id);
      return o ? o[target] || o.ru || o.es || o.en || String(id) : String(id);
    };
    return ids.map(label).join(', ');
  }
  if (typeof answer === 'boolean') return answer ? 'said it' : 'not yet';
  if (Array.isArray(answer)) return answer.join(' ');
  if (typeof answer === 'object') {
    return Object.entries(answer as Record<string, string>)
      .map(([l, r]) => `${l} = ${r}`)
      .join(', ');
  }
  return String(answer);
}

/** "Tue 14:02" - when a thing happened. */
function at(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const t = DateTime.fromISO(iso);
  return t.isValid ? t.toFormat('ccc HH:mm') : null;
}

/** Her tick, her note and her voice, kept on screen until the refetch brings them back. */
type Margin = {
  teacher_score?: number | null;
  teacher_note?: string | null;
  teacher_audio_path?: string | null;
};

/**
 * Marking his work.
 *
 * The app can say whether an answer matched; it cannot say whether he has
 * understood, and it certainly cannot write him a note. So everything here
 * is her reading HIS answers - and hearing them, when he was asked to speak:
 * a tick or a cross of her own on each, a word in the margin, typed or said,
 * a mark that writes itself from the ticks until she says otherwise. On a
 * phone the mark and the two ways to give it back stay at the bottom; on a
 * desk they live in the rail, and all of it runs from the home row.
 */
export function MarkRoute() {
  const { lessonId } = useParams<{ lessonId: string }>();
  // Remount per lesson: "next in the queue" navigates in place, and the
  // previous lesson's typed score, note and focus were carried into it.
  return <MarkLesson key={lessonId ?? 'none'} />;
}

function MarkLesson() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const { data: lesson, isLoading } = useLesson(lessonId);
  const { data: attempts } = useAttemptsForMarking(lessonId);
  const { data: hisRows } = usePartnerProgress();
  const { partner } = usePartner();
  const saveProgress = useSaveProgress();
  const markAttempt = useMarkAttempt();
  const { upload } = useUpload();
  const { native: support } = useLanguages();
  const navigate = useNavigate();
  const desk = useIsDesk();
  useDesk();
  // His answers arrive while she is looking - homework handed in mid-call.
  useTableSync('lang_attempts', qk.lang.attempts(lessonId ?? 'none'), {
    enabled: !!lessonId,
  });
  useTableSync('lang_lesson_progress', qk.lang.progress());

  const [scoreText, setScoreText] = useState('');
  const [scoreTouched, setScoreTouched] = useState(false);
  const [scoreOpen, setScoreOpen] = useState(false);
  const [note, setNote] = useState('');
  const [voice, setVoice] = useState<AudioClip | null>(null);
  const [wake, setWake] = useState(false);
  const [noteSheet, setNoteSheet] = useState(false);
  const [margin, setMargin] = useState<Record<string, Margin>>({});
  const [focus, setFocus] = useState(0);
  const [noteFor, setNoteFor] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [voiceFor, setVoiceFor] = useState<string | null>(null);
  const [sending, setSending] = useState<string | null>(null);
  const noteSaved = useRef(false);
  const rows = useRef<(HTMLDivElement | null)[]>([]);

  /** His newest answer per question, with her margin on it. */
  const his = useMemo(() => {
    const out = new Map<string, Attempt>();
    for (const a of attempts ?? []) {
      if (a.user_id === partner?.user_id && !out.has(a.exercise_id)) {
        out.set(a.exercise_id, { ...a, ...margin[a.id] });
      }
    }
    return out;
  }, [attempts, partner?.user_id, margin]);

  const hisProgress = (hisRows ?? []).find((p) => p.lesson_id === lessonId);
  // Her note from last time, if she is back for a second look.
  useEffect(() => {
    setNote(hisProgress?.teacher_note ?? '');
  }, [hisProgress?.teacher_note]);

  const answered = useMemo(
    () => (lesson?.exercises ?? []).filter((ex) => his.has(ex.id)),
    [lesson, his]
  );
  const verdicts = answered.map((ex) => verdictOf(his.get(ex.id)));
  // The mark writes itself from the ticks; she only has to touch it when
  // that is unfair.
  const auto = weightedScore(
    answered.map((ex, i) => ({ points: ex.points, score: verdicts[i]?.score }))
  );
  const score = scoreTouched
    ? scoreText
    : auto == null
      ? ''
      : String(Math.round(auto * 100));

  // Open on the first thing that needs her.
  const firstWrong = verdicts.findIndex((v) => v && !v.correct);
  const opened = useRef(false);
  useEffect(() => {
    if (opened.current || !answered.length) return;
    opened.current = true;
    setFocus(firstWrong >= 0 ? firstWrong : 0);
  }, [answered.length, firstWrong]);
  useEffect(() => {
    rows.current[focus]?.scrollIntoView({ block: 'nearest' });
  }, [focus]);

  const setVerdict = (ex: Exercise, teacherScore: number | null) => {
    const a = his.get(ex.id);
    if (!a || !lessonId) return;
    setMargin((m) => ({
      ...m,
      [a.id]: { ...m[a.id], teacher_score: teacherScore },
    }));
    markAttempt.mutate({ id: a.id, lessonId, teacherScore });
  };
  const openNote = (ex: Exercise) => {
    const a = his.get(ex.id);
    if (!a) return;
    noteSaved.current = false;
    setNoteFor(a.id);
    setNoteText(a.teacher_note ?? '');
  };
  const saveNote = () => {
    // Enter saves and unmounts the box, and the blur that follows must not
    // save it twice.
    if (!noteFor || !lessonId || noteSaved.current) return;
    noteSaved.current = true;
    const text = noteText.trim() || null;
    setMargin((m) => ({
      ...m,
      [noteFor]: { ...m[noteFor], teacher_note: text },
    }));
    markAttempt.mutate({ id: noteFor, lessonId, teacherNote: text });
    setNoteFor(null);
  };

  /** Her voice on one answer: up the moment she stops, replacing the last. */
  const uploadVoice = async (clip: AudioClip) => {
    const path = storagePaths.languageVoice(nanoid(10), clip.ext);
    await upload(BUCKETS.languageAudio, path, clip.blob, {
      contentType: clip.mime,
      cacheControl: '31536000',
    });
    return path;
  };
  const sendVoice = async (attemptId: string, clip: AudioClip | null) => {
    if (!clip || !lessonId) return;
    setSending(attemptId);
    try {
      const path = await uploadVoice(clip);
      const old = [...his.values()].find(
        (a) => a.id === attemptId
      )?.teacher_audio_path;
      setMargin((m) => ({
        ...m,
        [attemptId]: { ...m[attemptId], teacher_audio_path: path },
      }));
      markAttempt.mutate({ id: attemptId, lessonId, teacherAudioPath: path });
      if (old) void supabase.storage.from(BUCKETS.languageAudio).remove([old]);
      setVoiceFor(null);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSending(null);
    }
  };

  const asleep = isAsleep(partner?.timezone);
  const clock = clockIn(partner?.timezone);

  /** Still waiting after this one, oldest first - marking is a queue. */
  const queue = (hisRows ?? [])
    .filter((r) => r.status === 'submitted' && r.lesson_id !== lessonId)
    .sort((a, b) => (a.submitted_at ?? '').localeCompare(b.submitted_at ?? ''));

  const giveBack = async (status: 'graded' | 'returned') => {
    if (!lesson || !partner || saveProgress.isPending) return;
    if (noteFor) saveNote();
    let teacherAudioPath: string | undefined;
    if (voice) {
      try {
        teacherAudioPath = await uploadVoice(voice);
      } catch (e) {
        toast.error((e as Error).message);
        return;
      }
    }
    saveProgress.mutate(
      {
        lessonId: lesson.id,
        forUserId: partner.user_id,
        status,
        score:
          status === 'graded'
            ? score
              ? Number(score) / 100
              : null
            : undefined,
        teacherNote: note.trim() || null,
        teacherAudioPath,
        title: lesson.title,
        wake,
      },
      {
        onSuccess: () => {
          const verb = status === 'graded' ? 'Marked' : 'Sent back';
          const next = queue[0];
          if (next?.lesson) {
            toast.success(`${verb}, next: ${next.lesson.title}`);
            navigate(`/language/mark/${next.lesson_id}`, { replace: true });
          } else {
            toast.success(verb);
            navigate(-1);
          }
        },
      }
    );
  };

  const focused = answered[focus];
  const step = (d: number) =>
    setFocus((f) =>
      Math.min(Math.max(f + d, 0), Math.max(answered.length - 1, 0))
    );
  useHotkeys(
    {
      j: () => step(1),
      arrowdown: () => step(1),
      k: () => step(-1),
      arrowup: () => step(-1),
      y: () => focused && setVerdict(focused, 1),
      n: () => focused && setVerdict(focused, 0),
      u: () => focused && setVerdict(focused, null),
      c: () => focused && openNote(focused),
      v: () => {
        const a = focused && his.get(focused.id);
        if (a) setVoiceFor(voiceFor === a.id ? null : a.id);
      },
      'mod+enter': () => void giveBack('graded'),
    },
    { enabled: !!lesson && answered.length > 0 }
  );

  const name = partner?.display_name ?? 'He';
  const seen = at(hisProgress?.opened_at);
  const handed = at(hisProgress?.submitted_at);

  // The header is the hand-in: whose, when, and what is next in the queue.
  useScreenChrome(
    {
      title: lesson ? `Marking: ${lesson.title}` : 'Marking',
      subtitle: handed
        ? `${name}, handed in ${handed}`
        : seen
          ? `${name}, opened ${seen}, not handed in`
          : undefined,
      stage: 'house',
      action:
        queue.length > 0 ? (
          <TopBarPill
            label="Next in the queue"
            to={`/language/mark/${queue[0].lesson_id}`}
            tone="quiet"
          >
            {queue.length} more
          </TopBarPill>
        ) : null,
    },
    [lesson?.title, name, handed, seen, queue[0]?.lesson_id, queue.length]
  );

  if (isLoading) return <ListSkeleton rows={4} header={false} />;
  if (!lesson) return <Empty icon="📄" title="No such lesson" />;

  if (!answered.length) {
    return (
      <Empty
        icon="⏳"
        title="Nothing to mark yet"
        hint={
          seen
            ? `${name} opened it ${seen} and hasn't answered.`
            : `${name} hasn't opened this one.`
        }
      />
    );
  }

  const right = verdicts.filter((v) => v?.correct).length;

  /** The big number, and a way to change it. */
  const scoreCard = (
    <button
      type="button"
      onClick={() => setScoreOpen(true)}
      aria-label="The mark, out of a hundred. Tap to change"
      className={cn(
        'lift-press w-full text-left outline-none focus-visible:ring-2 focus-visible:ring-gold',
        desk ? 'rounded-card' : 'rounded-[14px]'
      )}
    >
      {desk ? (
        <Card tone="hero" className="space-y-1 text-center">
          <span className="block font-sans text-[11px] font-bold uppercase tracking-[0.14em] text-gold">
            Mark
          </span>
          <span className="block font-sans text-[44px] font-extrabold leading-none tabular-nums text-gold">
            {score || '-'}
          </span>
          <span className="block font-sans text-xs font-medium text-muted">
            {scoreTouched
              ? 'yours, tap to change'
              : 'from your ticks, tap to change'}
          </span>
        </Card>
      ) : (
        <span className="flex min-h-[56px] items-center gap-3 rounded-[14px] border border-fg/[0.08] bg-surface px-3.5 py-2">
          <span className="font-sans text-[22px] font-extrabold tabular-nums text-gold">
            {score || '-'}
          </span>
          <span className="min-w-0 flex-1 font-sans text-[11.5px] font-medium leading-snug text-muted">
            {scoreTouched
              ? 'yours, tap to change.'
              : 'from your ticks, tap to change.'}{' '}
            A note or voice goes with it
          </span>
          <span
            role="presentation"
            onClick={(e) => {
              e.stopPropagation();
              setNoteSheet(true);
            }}
            className={cn(
              'flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[11px]',
              note.trim() || voice
                ? 'bg-accent text-accent-fg'
                : 'bg-surface-2 text-gold'
            )}
          >
            {note.trim() && !voice ? (
              <MessageSquare className="h-4 w-4" />
            ) : (
              <Mic className="h-4 w-4" />
            )}
          </span>
        </span>
      )}
    </button>
  );

  /** Everything that goes back with the mark: the note, her voice, the buzz. */
  const noteBlock = (
    <div className="space-y-3">
      <div>
        <SectionLabel as="p">A note for him</SectionLabel>
        <Textarea
          tone="ink"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="почти! watch the ending on the second one"
        />
      </div>
      <div className="space-y-1.5">
        {hisProgress?.teacher_audio_path && !voice && (
          <div className="flex items-center gap-2">
            <PlayButton
              bucket={BUCKETS.languageAudio}
              path={hisProgress.teacher_audio_path}
              size="sm"
              label="Your voice note"
            />
            <span className="font-sans text-xs text-muted">
              your voice note from last time
            </span>
          </div>
        )}
        <div className="flex items-center gap-2.5">
          <AudioRecorder resetKey={lessonId} onRecorded={setVoice} />
          <span className="font-sans text-xs font-medium text-muted">
            or say it, goes with the mark
          </span>
        </div>
      </div>
      <QuietNote clock={clock} asleep={asleep} wake={wake} onWake={setWake} />
    </div>
  );

  const giveButtons = (
    <div
      className={cn(
        'grid gap-2',
        desk ? 'grid-cols-1' : 'grid-cols-[1fr_1.4fr]'
      )}
    >
      {!desk && (
        <Button
          variant="secondary"
          size="md"
          disabled={saveProgress.isPending || !partner}
          onClick={() => void giveBack('returned')}
          className="whitespace-nowrap rounded-[14px] px-3 text-sm"
        >
          <RotateCcw className="h-4 w-4" /> Send back
        </Button>
      )}
      <Button
        size="md"
        disabled={saveProgress.isPending || !partner}
        onClick={() => void giveBack('graded')}
        className="whitespace-nowrap rounded-[14px] border border-gold/25 px-3 text-sm"
      >
        {desk ? (
          <>
            Give it back{queue.length ? ', next in queue' : ''}
            <ChevronRight className="h-4 w-4" />
          </>
        ) : (
          <>
            Give it back <Send className="h-4 w-4" />
          </>
        )}
      </Button>
      {desk && (
        <Button
          variant="secondary"
          size="sm"
          disabled={saveProgress.isPending || !partner}
          onClick={() => void giveBack('returned')}
        >
          <RotateCcw className="h-4 w-4" /> Send back for another go
        </Button>
      )}
    </div>
  );

  /** Her verdict - the desk's right pane. */
  const inspector = (
    <div className="flex min-h-full flex-col gap-4">
      {scoreCard}
      {noteBlock}
      <div className="mt-auto space-y-3 pt-2">
        {giveButtons}
        <p className="font-sans text-[11px] leading-6 text-muted/80">
          <Kbd>J</Kbd> <Kbd>K</Kbd> move, <Kbd>Y</Kbd> <Kbd>N</Kbd> tick and
          cross, <Kbd>U</Kbd> undo, <Kbd>C</Kbd> note, <Kbd>V</Kbd> voice,{' '}
          <Kbd>⌘↵</Kbd> give back
        </p>
      </div>
    </div>
  );

  return (
    <Desk inspector={inspector} inspectorOnPhone="hidden" narrow>
      <div
        className={cn('curtain-reveal space-y-2.5', desk ? 'pb-2' : 'pb-24')}
      >
        {desk && (
          <p className="font-sans text-xs font-medium text-muted">
            {right} of {answered.length} right so far
          </p>
        )}
        {answered.map((ex, i) => {
          const a = his.get(ex.id)!;
          const v = verdicts[i]!;
          const isFocused = i === focus;
          const spoken = ex.kind === 'speak' ? speakAnswer(a.answer) : null;
          const hers = v.hers;
          const wanted = answerText(ex, lesson.targetLang);
          const meta = [
            exerciseKindLabel(ex),
            ex.points > 1 ? `${ex.points} pts` : null,
            a.attempt_no > 1 ? `${a.attempt_no} tries` : null,
          ]
            .filter(Boolean)
            .join(', ');
          const tools = (
            <div
              className={cn(
                'grid gap-2',
                desk
                  ? 'grid-cols-[52px_52px_40px_40px]'
                  : 'grid-cols-[1fr_1fr_44px_44px]'
              )}
            >
              <Button
                variant={hers && v.correct ? 'affirm' : 'secondary'}
                size={desk ? 'xs' : 'sm'}
                aria-label="Right"
                aria-pressed={hers && v.correct}
                onClick={() => setVerdict(ex, hers && v.correct ? null : 1)}
                className={desk ? 'px-0' : ''}
              >
                <Check className="h-4 w-4" />
                {!desk && 'Right'}
              </Button>
              <Button
                variant={hers && !v.correct ? 'destructive' : 'secondary'}
                size={desk ? 'xs' : 'sm'}
                aria-label="Wrong"
                aria-pressed={hers && !v.correct}
                onClick={() => setVerdict(ex, hers && !v.correct ? null : 0)}
                className={desk ? 'px-0' : ''}
              >
                <X className="h-4 w-4" />
                {!desk && 'Wrong'}
              </Button>
              <button
                type="button"
                aria-label="A word in the margin"
                aria-pressed={noteFor === a.id}
                onClick={() => openNote(ex)}
                className={cn(
                  'lift-press flex items-center justify-center rounded border outline-none focus-visible:ring-2 focus-visible:ring-gold',
                  desk ? 'h-9 w-10' : 'h-11 w-11',
                  noteFor === a.id || a.teacher_note
                    ? 'border-accent bg-accent text-accent-fg'
                    : 'border-fg/[0.08] bg-surface-2 text-muted'
                )}
              >
                <MessageSquare className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="Say it for him"
                aria-pressed={voiceFor === a.id}
                onClick={() => setVoiceFor(voiceFor === a.id ? null : a.id)}
                className={cn(
                  'lift-press flex items-center justify-center rounded border outline-none focus-visible:ring-2 focus-visible:ring-gold',
                  desk ? 'h-9 w-10' : 'h-11 w-11',
                  voiceFor === a.id || a.teacher_audio_path
                    ? 'border-accent bg-accent text-accent-fg'
                    : 'border-fg/[0.08] bg-surface-2 text-muted'
                )}
              >
                <Mic className="h-4 w-4" />
              </button>
            </div>
          );
          return (
            <div
              key={ex.id}
              ref={(el) => {
                rows.current[i] = el;
              }}
              onClick={() => setFocus(i)}
            >
              <ExerciseCard
                index={i + 1}
                kind={meta}
                tone={
                  isFocused && desk ? 'focused' : !v.correct ? 'wrong' : 'plain'
                }
                aside={
                  hers ? (
                    <span className="text-gold">your call</span>
                  ) : v.correct ? (
                    <span className="text-[#a9b37e]">✓ auto</span>
                  ) : (
                    <span className="text-[#e0919b]">✗ auto</span>
                  )
                }
              >
                <div className={cn(desk && 'flex items-center gap-3')}>
                  <div className="min-w-0 flex-1 space-y-2">
                    <p className="font-sans text-sm font-semibold text-muted">
                      {pick(ex, 'prompt', support) || 'Untitled question'}
                    </p>
                    {spoken ? (
                      <div className="flex items-center gap-2.5">
                        {spoken.audio && (
                          <PlayButton
                            bucket={BUCKETS.languageAudio}
                            path={spoken.audio}
                            size="sm"
                            label="Hear him"
                          />
                        )}
                        <span className="font-sans text-[13px] font-medium text-muted">
                          {spoken.audio ? 'his recording, ' : ''}
                          {spoken.ok === true
                            ? 'he says he got it'
                            : spoken.ok === false
                              ? 'he says not yet'
                              : 'he did not mark himself'}
                        </span>
                      </div>
                    ) : (
                      <p className="font-display text-[18px] leading-snug text-fg">
                        {shown(ex, a.answer, lesson.targetLang)}
                      </p>
                    )}
                    {!v.correct && ex.kind !== 'speak' && wanted && (
                      <p className="font-sans text-xs font-medium text-muted">
                        wanted:{' '}
                        <span className="font-display text-[15px] text-fg">
                          {wanted}
                        </span>
                      </p>
                    )}
                  </div>
                  {desk && tools}
                </div>
                {!desk && tools}
                {noteFor === a.id ? (
                  <MarginNoteEditor
                    value={noteText}
                    onChange={setNoteText}
                    onSave={saveNote}
                    onCancel={() => setNoteFor(null)}
                  />
                ) : (
                  <MarginNote
                    note={a.teacher_note}
                    audioPath={
                      voiceFor === a.id ? undefined : a.teacher_audio_path
                    }
                    who="Your note in the margin"
                  />
                )}
                {voiceFor === a.id && (
                  <div className="space-y-1">
                    <AudioRecorder
                      resetKey={a.id}
                      onRecorded={(c) => void sendVoice(a.id, c)}
                    />
                    <p className="font-sans text-xs text-muted">
                      {sending === a.id
                        ? 'Sending your voice…'
                        : 'Stop, and it goes to him with the mark.'}
                    </p>
                  </div>
                )}
              </ExerciseCard>
            </div>
          );
        })}

        {!desk && (
          <StickyFooter>
            <div className="space-y-2">
              {scoreCard}
              {giveButtons}
            </div>
          </StickyFooter>
        )}

        <Dialog
          placement="auto"
          open={scoreOpen}
          onClose={() => setScoreOpen(false)}
          title="The mark"
          size="sm"
        >
          <div className="space-y-3">
            <Input
              tone="ink"
              value={score}
              onChange={(e) => {
                setScoreTouched(true);
                setScoreText(e.target.value.replace(/[^\d]/g, ''));
              }}
              inputMode="numeric"
              placeholder="90"
              aria-label="Out of a hundred"
              autoFocus
              className="text-center text-[28px] font-extrabold tabular-nums text-gold"
            />
            <p className="text-center font-sans text-xs text-muted">
              {scoreTouched
                ? 'Yours. '
                : 'From your ticks, change it if that is unfair. '}
              Out of a hundred.
            </p>
            <Button full onClick={() => setScoreOpen(false)}>
              Done
            </Button>
          </div>
        </Dialog>

        <Dialog
          placement="bottom"
          open={noteSheet}
          onClose={() => setNoteSheet(false)}
          title="With the mark"
          size="half"
        >
          <div className="space-y-3 pb-1">
            {noteBlock}
            <Button full onClick={() => setNoteSheet(false)}>
              Done
            </Button>
          </div>
        </Dialog>
      </div>
    </Desk>
  );
}
