import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ChevronLeft, ChevronRight, Eye, Plus, X } from 'lucide-react';
import { useHotkeys, useMediaQuery } from '@kernel/hooks';
import { useTableSync } from '@kernel/realtime';
import { qk } from '@kernel/query';
import {
  AudioRecorder,
  Button,
  Dialog,
  Empty,
  Field,
  Input,
  Kbd,
  ListSkeleton,
  toast,
  DESK_QUERY,
  type AudioClip,
} from '@kernel/ui';
import { useLesson } from '../api/lessons.queries';
import { useCreateBlock } from '../api/lessons.mutations';
import { useAddVocab } from '../api/vocab';
import { useSetBlockVocab } from '../api/block-vocab';
import { useLanguages } from '../lib/languages';
import { useClassChannel } from '../lib/class-channel';
import { acceptedForms, type ExerciseOption } from '../lib/exercise-schema';
import { BlockView } from '../components/block-view';
import { ExerciseView } from '../components/exercises/exercise-view';
import {
  LANG_NATIVE_LABELS,
  type Block,
  type Exercise,
  type Lang,
  type LessonFull,
  type MediaBlockData,
} from '../types';

/** The right answer, said plainly - for "show him". */
function answerText(ex: Exercise, target: Lang): string {
  const payload = ex.payload as {
    options?: ExerciseOption[];
    pairs?: { left: string; right: string }[];
  } | null;
  const label = (o: ExerciseOption | undefined) =>
    o ? o[target] || o.ru || o.es || o.en || '' : '';
  switch (ex.kind) {
    case 'choice':
      return label(payload?.options?.find((o) => o.id === ex.answer));
    case 'multi': {
      const ids = (ex.answer as string[] | null) ?? [];
      return (payload?.options ?? [])
        .filter((o) => ids.includes(o.id))
        .map(label)
        .join(' - ');
    }
    case 'match':
      return (payload?.pairs ?? [])
        .map((p) => `${p.left} = ${p.right}`)
        .join(' - ');
    case 'order': {
      const a = ex.answer as unknown;
      const first = Array.isArray(a) && Array.isArray(a[0]) ? a[0] : a;
      return Array.isArray(first) ? (first as string[]).join(' ') : '';
    }
    case 'complete':
      return ((ex.answer as unknown[]) ?? [])
        .map((gap) => acceptedForms(gap).join(' / '))
        .join(' - ');
    case 'speak':
      return '';
    default:
      return acceptedForms(ex.answer).join(' - ');
  }
}

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

/**
 * Teach mode - the lesson on the video call.
 *
 * One block at a time, big enough to read off a shared screen; her audio a
 * tap away; the questions with their answers held back until she says so;
 * the screen kept awake; and a way to catch a word that comes up mid-class
 * and put it straight into the lesson without leaving the stage.
 */
export function TeachRoute() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const { data: lesson, isLoading } = useLesson(lessonId);
  const { native: support } = useLanguages();
  const navigate = useNavigate();
  // By the screen, not the desk registry: this overlay never asks for a desk.
  const desk = useMediaQuery(DESK_QUERY);
  useWakeLock();
  useTableSync('lang_blocks', qk.lang.lesson(lessonId ?? 'none'), {
    filter: lessonId ? `lesson_id=eq.${lessonId}` : undefined,
    enabled: !!lessonId,
  });

  const [i, setI] = useState(0);
  const [shown, setShown] = useState<Set<string>>(new Set());
  const [catching, setCatching] = useState(false);
  const { send } = useClassChannel(lessonId ?? undefined);

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
  const next = () => setI((n) => Math.min(n + 1, last));
  const prev = () => setI((n) => Math.max(n - 1, 0));
  const slide = slides[Math.min(i, last)];
  // His lesson page follows: every turn of the page is broadcast.
  useEffect(() => {
    if (!slide) return;
    send({
      blockId: slide.block?.id ?? null,
      index: Math.min(i, last),
      total: slides.length,
    });
  }, [slide, i, last, slides.length, send]);
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

  if (isLoading) return <ListSkeleton rows={3} />;
  if (!lesson) return <Empty icon="📄" title="No such lesson" />;

  const mediaFor = (block: Block) => {
    if (block.kind !== 'media') return undefined;
    const { mediaId } = (block.data ?? {}) as MediaBlockData;
    return lesson.media.find((m) => m.id === mediaId);
  };

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-bg text-fg">
      <header className="flex items-center justify-between gap-3 px-4 py-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex shrink-0 items-center gap-1 font-sans text-sm text-muted hover:text-fg"
        >
          <X className="h-4 w-4" /> Leave
        </button>
        <p className="min-w-0 truncate font-display text-base text-fg">
          {lesson.title}
        </p>
        <p className="shrink-0 font-sans text-xs tabular-nums text-muted">
          {slides.length ? `${Math.min(i, last) + 1} / ${slides.length}` : ''}
        </p>
      </header>

      <main className="teach-stage min-h-0 flex-1 overflow-y-auto px-6 py-6 md:px-16">
        {!slide ? (
          <Empty icon="✍️" title="Nothing here yet" />
        ) : (
          <div className="mx-auto flex min-h-full max-w-3xl flex-col justify-center gap-6">
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
            {slide.exercises.map((ex) => (
              <div
                key={ex.id}
                className="space-y-2 rounded-lg bg-surface px-4 py-3"
              >
                <ExerciseView
                  exercise={ex}
                  support={support}
                  target={lesson.targetLang}
                  value={undefined}
                  onChange={() => {}}
                  disabled
                />
                {shown.has(ex.id) ? (
                  <p className="font-display text-2xl text-gold">
                    {answerText(ex, lesson.targetLang) || '-'}
                  </p>
                ) : (
                  <Button
                    size="xs"
                    variant="secondary"
                    onClick={() => setShown((s) => new Set(s).add(ex.id))}
                  >
                    <Eye size={13} /> Show him the answer
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      <footer className="flex items-center justify-between gap-2 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <Button variant="secondary" disabled={i === 0} onClick={prev}>
          <ChevronLeft size={16} /> Back
        </Button>
        <div className="flex items-center gap-3">
          <Button
            size="xs"
            variant="secondary"
            onClick={() => setCatching(true)}
          >
            <Plus size={13} /> A word
          </Button>
          {desk && (
            <p className="font-sans text-xs text-muted">
              <Kbd>→</Kbd> next - <Kbd>A</Kbd> answers - <Kbd>W</Kbd> a word
            </p>
          )}
        </div>
        <Button disabled={i >= last} onClick={next}>
          Next <ChevronRight size={16} />
        </Button>
      </footer>

      <CatchWord
        open={catching}
        onClose={() => setCatching(false)}
        lesson={lesson}
        blockId={slide?.block?.kind === 'vocab' ? slide.block.id : null}
      />
    </div>
  );
}

/**
 * A word that came up mid-class, into the dictionary and into this lesson
 * in one go - the thing she used to do afterwards from memory, or not.
 */
function CatchWord({
  open,
  onClose,
  lesson,
  blockId,
}: {
  open: boolean;
  onClose: () => void;
  lesson: LessonFull;
  /** The vocab block on screen, if the slide is one. */
  blockId: string | null;
}) {
  const { learning } = useLanguages();
  const target = lesson.targetLang;
  // The meaning is for the one LEARNING - in their language, not hers.
  const meaningLang: Lang = learning === target ? 'en' : learning;
  const add = useAddVocab();
  const setBlockVocab = useSetBlockVocab();
  const createBlock = useCreateBlock();
  const [term, setTerm] = useState('');
  const [meaning, setMeaning] = useState('');
  const [clip, setClip] = useState<AudioClip | null>(null);
  const [take, setTake] = useState(0);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!term.trim() || busy) return;
    setBusy(true);
    try {
      const id = await add.mutateAsync({
        termLang: target,
        [target]: term,
        [meaningLang]: meaning,
        audio: clip,
      });
      // Into this slide's word list, else the lesson's last one, else a
      // new one at the end - the word must land in the lesson, not only in
      // the dictionary.
      let block =
        blockId ??
        [...lesson.blocks].reverse().find((b) => b.kind === 'vocab')?.id ??
        null;
      if (!block) {
        block = await createBlock.mutateAsync({
          lessonId: lesson.id,
          kind: 'vocab',
          position: lesson.blocks.length,
        });
      }
      const existing = (lesson.vocabByBlock[block] ?? [])
        .map((w) => w.id)
        .filter((x) => x !== id);
      await setBlockVocab.mutateAsync({
        blockId: block,
        lessonId: lesson.id,
        vocabIds: [...existing, id],
      });
      toast.success(`«${term.trim()}» is in the lesson`);
      setTerm('');
      setMeaning('');
      setClip(null);
      setTake((t) => t + 1);
      onClose();
    } catch {
      /* the mutation has already said what went wrong */
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      placement="auto"
      open={open}
      onClose={onClose}
      title="A word that came up"
      size="sm"
    >
      <div className="space-y-3">
        <Field label={`In ${LANG_NATIVE_LABELS[target]}`}>
          <Input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            className="font-display text-lg"
            autoFocus
          />
        </Field>
        <Field label={`Meaning, in ${LANG_NATIVE_LABELS[meaningLang]}`}>
          <Input
            value={meaning}
            onChange={(e) => setMeaning(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void submit();
            }}
          />
        </Field>
        <AudioRecorder resetKey={take} onRecorded={setClip} />
        <Button
          full
          disabled={!term.trim() || busy}
          onClick={() => void submit()}
        >
          Into the lesson
        </Button>
      </div>
    </Dialog>
  );
}
