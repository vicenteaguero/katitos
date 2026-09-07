import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  AlignLeft,
  BookMarked,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  Eye,
  Mic,
  Paperclip,
  Plus,
  Table,
  X,
} from 'lucide-react';
import { useHotkeys, useMediaQuery, useNow } from '@kernel/hooks';
import { useTableSync } from '@kernel/realtime';
import { qk } from '@kernel/query';
import { cn } from '@kernel/lib';
import {
  Button,
  Empty,
  Input,
  Kbd,
  ListSkeleton,
  ProgressBar,
  SectionLabel,
  DESK_QUERY,
  useScreenChrome,
} from '@kernel/ui';
import { useLesson } from '../api/lessons.queries';
import { useLanguages } from '../lib/languages';
import { useClassChannel } from '../lib/class-channel';
import { exerciseKindLabel } from '../lib/exercise-kinds';
import { BlockView } from '../components/block-view';
import { ExerciseView } from '../components/exercises/exercise-view';
import { CatchWordSheet } from '../components/catch-word';
import { useCatchWord } from '../api/catch-word';
import { ExerciseCard } from '../components/kit';
import {
  LANG_NATIVE_LABELS,
  type Block,
  type Exercise,
  type LessonFull,
  type MediaBlockData,
} from '../types';

/** Keep the screen on for the length of a class. */
function useWakeLock() {
  useEffect(() => {
    if (!('wakeLock' in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    const take = async () => {
      try {
        lock = await navigator.wakeLock.request('screen');
      } catch {
        /* a phone that will not - the screen dims, nothing else */
      }
    };
    void take();
    // The lock is dropped whenever the tab is hidden; take it again after.
    const back = () => {
      if (document.visibilityState === 'visible') void take();
    };
    document.addEventListener('visibilitychange', back);
    return () => {
      document.removeEventListener('visibilitychange', back);
      void lock?.release();
    };
  }, []);
}

interface Slide {
  block: Block | null;
  exercises: Exercise[];
}

/** What a slide is, in one word, for the rail. */
function slideTitle(s: Slide, target: LessonFull['targetLang']): string {
  const b = s.block;
  if (b?.kind === 'text') {
    const head = (b[`body_${target}`] ?? b.body_en ?? '').trim();
    return head.split('\n')[0] || 'Text';
  }
  if (b?.kind === 'vocab') return 'Words';
  if (b?.kind === 'table') return 'A table';
  if (b?.kind === 'media') return 'Material';
  if (b?.kind === 'divider') return 'A break';
  const ex = s.exercises[0];
  return ex
    ? ((ex.prompt_en || ex.prompt_es || ex.prompt_ru) ?? 'A question')
    : 'A question';
}

function SlideIcon({ s }: { s: Slide }) {
  const k = s.block?.kind;
  const cls = 'h-3.5 w-3.5';
  if (k === 'text') return <AlignLeft className={cls} />;
  if (k === 'vocab') return <BookMarked className={cls} />;
  if (k === 'table') return <Table className={cls} />;
  if (k === 'media') return <Paperclip className={cls} />;
  if (s.exercises[0]?.kind === 'speak') return <Mic className={cls} />;
  return <CircleDot className={cls} />;
}

/**
 * Teach mode - the lesson on the video call.
 *
 * One block at a time, big enough to read off a shared screen; her audio a
 * tap away; the questions with their answers held back until she says so;
 * the screen kept awake; a line that says he is with her; and a way to
 * catch a word that comes up mid-class and put it straight into the lesson
 * without leaving the stage. On a laptop the stage stays clean for
 * screen-share and everything teacher-only lives in a rail.
 */
export function TeachRoute() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const { data: lesson, isLoading } = useLesson(lessonId);
  const { native: support } = useLanguages();
  const navigate = useNavigate();
  // By the screen, not the desk registry: this overlay never asks for a desk.
  const desk = useMediaQuery(DESK_QUERY);
  useWakeLock();
  // The tab bar under the stage goes away; nothing under here is reachable.
  useScreenChrome({ hideNav: true }, []);
  useTableSync('lang_blocks', qk.lang.lesson(lessonId ?? 'none'), {
    filter: lessonId ? `lesson_id=eq.${lessonId}` : undefined,
    enabled: !!lessonId,
  });

  const [i, setI] = useState(0);
  const [shown, setShown] = useState<Set<string>>(new Set());
  const [catching, setCatching] = useState(false);
  const { send, following } = useClassChannel(lessonId ?? undefined);
  const [startedAt] = useState(() => Date.now());
  const now = useNow(30_000);
  const minutesIn = Math.max(
    0,
    Math.round((now.toMillis() - startedAt) / 60_000)
  );

  const slides = useMemo<Slide[]>(() => {
    if (!lesson) return [];
    const out: Slide[] = lesson.blocks.map((b) => ({
      block: b,
      exercises: lesson.exercisesByBlock[b.id] ?? [],
    }));
    if (lesson.looseExercises.length)
      out.push({ block: null, exercises: lesson.looseExercises });
    return out;
  }, [lesson]);

  const last = Math.max(slides.length - 1, 0);
  const at = Math.min(i, last);
  const next = () => setI((n) => Math.min(n + 1, last));
  const prev = () => setI((n) => Math.max(n - 1, 0));
  const slide = slides[at];
  // His lesson page follows: every turn of the page is broadcast.
  useEffect(() => {
    if (!slide) return;
    send({
      blockId: slide.block?.id ?? null,
      index: at,
      total: slides.length,
    });
  }, [slide, at, slides.length, send]);
  const revealAll = () =>
    slide &&
    setShown((s) => {
      const out = new Set(s);
      for (const ex of slide.exercises) out.add(ex.id);
      return out;
    });

  useHotkeys(
    {
      arrowright: next,
      space: next,
      j: next,
      arrowleft: prev,
      k: prev,
      a: revealAll,
      w: () => setCatching(true),
      escape: () => (catching ? undefined : navigate(-1)),
    },
    { enabled: !!lesson && !catching }
  );

  if (isLoading) return <ListSkeleton rows={3} header={false} />;
  if (!lesson) return <Empty icon="📄" title="No such lesson" />;

  const mediaFor = (block: Block) => {
    if (block.kind !== 'media') return undefined;
    const { mediaId } = (block.data ?? {}) as MediaBlockData;
    return lesson.media.find((m) => m.id === mediaId);
  };

  const status =
    following !== null
      ? `he's following, slide ${following + 1}`
      : `slide ${at + 1} of ${slides.length}`;
  const live = following !== null;
  const hasQuestions = !!slide && slide.exercises.length > 0;
  const allShown = !!slide && slide.exercises.every((ex) => shown.has(ex.id));
  const catchBlock = slide?.block?.kind === 'vocab' ? slide.block.id : null;

  const stage = !slide ? (
    <Empty icon="✍️" title="Nothing here yet" />
  ) : (
    <div
      className={cn(
        'mx-auto flex min-h-full w-full flex-col justify-center gap-5',
        desk ? 'max-w-[820px]' : 'max-w-3xl'
      )}
    >
      {slide.block && (
        <div data-readable>
          <BlockView
            block={slide.block}
            support={support}
            target={lesson.targetLang}
            vocab={lesson.vocabByBlock[slide.block.id]}
            media={mediaFor(slide.block)}
          />
        </div>
      )}
      {slide.exercises.map((ex, k) => (
        <ExerciseCard
          key={ex.id}
          index={k + 1}
          kind={`Exercise, ${exerciseKindLabel(ex).toLowerCase()}`}
          className="rounded-[20px] p-[18px]"
          footer={
            !desk &&
            ex.kind !== 'speak' &&
            !shown.has(ex.id) && (
              <Button
                full
                variant="outline"
                size="sm"
                onClick={() => setShown((s) => new Set(s).add(ex.id))}
              >
                <Eye className="h-4 w-4" /> Reveal the answer
              </Button>
            )
          }
        >
          <ExerciseView
            exercise={ex}
            support={support}
            target={lesson.targetLang}
            value={undefined}
            onChange={() => {}}
            disabled
            reveal={shown.has(ex.id)}
          />
          {ex.kind === 'speak' && (
            <p className="font-sans text-[15px] text-muted">
              He says it on the call. You hear it live, no reveal needed.
            </p>
          )}
        </ExerciseCard>
      ))}
    </div>
  );

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-bg text-fg md:flex-row">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {/* ── the header: where we are, and that he is here ───────────── */}
        <header
          className={cn(
            'flex shrink-0 flex-col gap-2 px-5',
            desk
              ? 'flex-row items-center gap-3 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]'
              : 'pt-[max(0.75rem,env(safe-area-inset-top))]'
          )}
        >
          {!desk && (
            <ProgressBar segments={slides.length} value={at} label="Slides" />
          )}
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <button
              type="button"
              aria-label="Leave the class"
              onClick={() => navigate(-1)}
              className="lift-press flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] border border-fg/[0.07] bg-surface text-fg outline-none focus-visible:ring-2 focus-visible:ring-gold"
            >
              <X className="h-[17px] w-[17px]" />
            </button>
            <div
              className={cn(
                'flex min-w-0 flex-1',
                desk ? 'flex-row items-center gap-3' : 'flex-col items-center'
              )}
            >
              <span className="truncate font-sans text-[15px] font-extrabold text-fg">
                {lesson.title}
              </span>
              <span
                className={cn(
                  'flex items-center gap-1.5 font-sans text-[11px] font-semibold',
                  live ? 'text-[#a9b37e]' : 'text-muted'
                )}
              >
                {live && (
                  <span className="h-1.5 w-1.5 rounded-full bg-[#a9b37e]" />
                )}
                {status}
              </span>
            </div>
            {desk ? (
              <>
                <div className="w-[220px]">
                  <ProgressBar
                    segments={slides.length}
                    value={at}
                    label="Slides"
                  />
                </div>
                <span className="shrink-0 font-sans text-xs font-bold tabular-nums text-muted">
                  {at + 1} / {slides.length}
                </span>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setCatching(true)}
                className="lift-press inline-flex h-10 shrink-0 items-center gap-1.5 rounded-[12px] border border-gold/25 bg-surface-2 px-3 font-sans text-[12.5px] font-bold text-gold outline-none focus-visible:ring-2 focus-visible:ring-gold"
              >
                <Plus className="h-3.5 w-3.5" /> Word
              </button>
            )}
          </div>
        </header>

        <main
          className={cn(
            'teach-stage min-h-0 flex-1 overflow-y-auto',
            desk ? 'px-[72px] py-6' : 'px-6 py-5'
          )}
        >
          {stage}
        </main>

        {/* ── two big targets, and on a desk the keys between them ─────── */}
        <footer
          className={cn(
            'grid shrink-0 items-center gap-2 px-5 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3',
            desk ? 'grid-cols-[100px_1fr_auto]' : 'grid-cols-[88px_1fr]'
          )}
        >
          <Button
            variant="secondary"
            disabled={at === 0}
            onClick={prev}
            aria-label="Back"
            className={cn('rounded-card', desk ? 'h-[52px]' : 'h-14')}
          >
            <ChevronLeft className="h-[22px] w-[22px]" />
          </Button>
          {desk && (
            <p className="text-center font-sans text-xs text-muted">
              <Kbd>→</Kbd> next, <Kbd>A</Kbd> reveal, <Kbd>W</Kbd> word
            </p>
          )}
          <Button
            onClick={at >= last ? () => navigate(-1) : next}
            className={cn(
              'rounded-card border border-gold/25 text-base',
              desk ? 'h-[52px] px-8' : 'h-14'
            )}
          >
            {at >= last ? 'End class' : 'Next'}
            <ChevronRight className="h-5 w-5" />
          </Button>
        </footer>
      </div>

      {/* ── the teacher's rail, laptop only ─────────────────────────────── */}
      {desk && (
        <aside className="flex w-[300px] shrink-0 flex-col border-l border-fg/[0.06] bg-surface">
          <div className="flex shrink-0 items-center justify-between px-4 pb-2 pt-3.5">
            <SectionLabel as="p" className="mb-0" note={`${minutesIn} min in`}>
              Slides
            </SectionLabel>
          </div>
          <ol className="min-h-0 flex-1 space-y-1 overflow-y-auto px-2.5">
            {slides.map((s, k) => (
              <li key={s.block?.id ?? `loose-${k}`}>
                <button
                  type="button"
                  aria-current={k === at ? 'true' : undefined}
                  onClick={() => setI(k)}
                  className={cn(
                    'flex min-h-[44px] w-full items-center gap-2.5 rounded px-2.5 py-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-gold',
                    k === at
                      ? 'border border-gold/30 bg-surface-2 text-fg'
                      : 'text-muted hover:bg-fg/5'
                  )}
                >
                  <span
                    className={cn(
                      'flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-lg font-sans text-[11.5px] font-bold',
                      k === at
                        ? 'bg-accent text-accent-fg'
                        : 'bg-surface-2 text-gold'
                    )}
                  >
                    {k + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-sans text-[13px] font-semibold">
                    {slideTitle(s, lesson.targetLang)}
                  </span>
                  <span className={k === at ? 'text-gold' : ''}>
                    <SlideIcon s={s} />
                  </span>
                </button>
              </li>
            ))}
          </ol>
          <div className="shrink-0 space-y-3 border-t border-fg/[0.06] px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3.5">
            <div>
              <SectionLabel as="p">This slide</SectionLabel>
              <Button
                full
                variant="outline"
                size="sm"
                disabled={!hasQuestions || allShown}
                onClick={revealAll}
              >
                <Eye className="h-4 w-4" />
                {allShown && hasQuestions ? 'Answer shown' : 'Reveal answer'}
                <Kbd>A</Kbd>
              </Button>
            </div>
            <QuickCatch lesson={lesson} blockId={catchBlock} />
          </div>
        </aside>
      )}

      <CatchWordSheet
        open={catching}
        onClose={() => setCatching(false)}
        lesson={lesson}
        blockId={catchBlock}
      />
    </div>
  );
}

/** The rail's one-line catch-a-word: the term, Enter, done. */
function QuickCatch({
  lesson,
  blockId,
}: {
  lesson: LessonFull;
  blockId: string | null;
}) {
  const { catchWord, busy, target } = useCatchWord(lesson, blockId);
  const [term, setTerm] = useState('');
  const go = async () => {
    if (await catchWord(term, '', null)) setTerm('');
  };
  return (
    <div>
      <SectionLabel as="p">A word came up</SectionLabel>
      <div className="flex gap-1.5">
        <Input
          tone="ink"
          serif
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void go();
          }}
          placeholder={
            target === 'ru' ? 'По-русски…' : `En ${LANG_NATIVE_LABELS[target]}…`
          }
          aria-label={`A word in ${LANG_NATIVE_LABELS[target]}`}
          lang={target}
          className="h-10 py-0 text-[15px]"
        />
        <button
          type="button"
          aria-label="Into the lesson and the dictionary"
          disabled={!term.trim() || busy}
          onClick={() => void go()}
          className="lift-press flex h-10 w-10 shrink-0 items-center justify-center rounded bg-accent text-accent-fg outline-none focus-visible:ring-2 focus-visible:ring-gold disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
      <p className="mt-1.5 font-sans text-[11px] font-medium text-muted/70">
        Enter: into this slide's words and the dictionary. The screen stays
        awake for the whole class.
      </p>
    </div>
  );
}
