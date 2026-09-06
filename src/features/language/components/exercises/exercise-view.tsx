import { useState } from 'react';
import { nanoid } from 'nanoid';
import { Mic } from 'lucide-react';
import { cn } from '@kernel/lib';
import { supabase } from '@kernel/supabase';
import { BUCKETS, storagePaths, useUpload } from '@kernel/storage';
import {
  AudioRecorder,
  Button,
  Input,
  OptionButton,
  PlayButton,
  toast,
  type AudioClip,
  type OptionState,
} from '@kernel/ui';
import type { Exercise, Lang } from '../../types';
import {
  acceptedForms,
  speakAnswer,
  splitTemplate,
  type ExerciseOption,
  type Grade,
} from '../../lib/exercise-schema';
import { pick } from '../../lib/pick';
import { hash } from '../../lib/study';
import { LetterKeys } from '../letter-keys';

/** An option reads in the language you learn in, falling back like everything else. */
function optionLabel(o: ExerciseOption, support: Lang): string {
  const order = support === 'es' ? [o.es, o.en, o.ru] : [o.en, o.es, o.ru];
  return order.find((v) => v && v.trim()) ?? '';
}

export interface ExerciseViewProps {
  exercise: Exercise;
  support: Lang;
  /** The language the lesson teaches - which keyboard a typed answer gets. */
  target: Lang;
  /** The answer so far. Owned by the runner so it survives a re-render. */
  value: unknown;
  onChange: (value: unknown) => void;
  /** Set once marked - the view then shows what was right. */
  grade?: Grade | null;
  disabled?: boolean;
}

/**
 * One question, in whichever of the eight shapes it is.
 *
 * Everything here is presentation: what counts as correct lives in
 * `exercise-schema.ts`, where it is pure and tested, so nothing on screen can
 * disagree with what gets stored.
 */
export function ExerciseView(props: ExerciseViewProps) {
  const { exercise, support } = props;
  const prompt = pick(exercise, 'prompt', support);

  return (
    <div className="space-y-2">
      {prompt && (
        <p className="font-sans text-sm font-semibold text-fg">{prompt}</p>
      )}
      <Body {...props} />
    </div>
  );
}

function Body(props: ExerciseViewProps) {
  switch (props.exercise.kind) {
    case 'choice':
      return <ChoiceView {...props} />;
    case 'multi':
      return <MultiView {...props} />;
    case 'type':
      return <TypeView {...props} />;
    case 'listen':
      return <ListenView {...props} />;
    case 'complete':
      return <CompleteView {...props} />;
    case 'order':
      return <OrderView {...props} />;
    case 'match':
      return <MatchView {...props} />;
    case 'speak':
      return <SpeakView {...props} />;
    default:
      return (
        <p className="font-sans text-xs text-danger">
          This question needs finishing.
        </p>
      );
  }
}

/** Which of the four looks an option has earned. */
function stateOf(picked: boolean, right: boolean, wrong: boolean): OptionState {
  return right ? 'right' : wrong ? 'wrong' : picked ? 'picked' : 'idle';
}

function ChoiceView({
  exercise,
  support,
  value,
  onChange,
  grade,
  disabled,
}: ExerciseViewProps) {
  const payload = exercise.payload as {
    options?: ExerciseOption[];
    audioPath?: string | null;
  };
  const options = payload?.options ?? [];
  return (
    <div className="space-y-1.5">
      {/* "Which did you hear?" - her voice IS the question. */}
      {payload?.audioPath && (
        <PlayButton
          bucket={BUCKETS.languageAudio}
          path={payload.audioPath}
          label="Hear it again"
        />
      )}
      {options.map((o) => {
        const picked = value === o.id;
        const marked = !!grade;
        return (
          <OptionButton
            key={o.id}
            state={stateOf(
              picked,
              marked && o.id === exercise.answer,
              marked && picked && o.id !== exercise.answer
            )}
            disabled={disabled}
            onClick={() => onChange(o.id)}
          >
            {optionLabel(o, support)}
          </OptionButton>
        );
      })}
    </div>
  );
}

function MultiView({
  exercise,
  support,
  value,
  onChange,
  grade,
  disabled,
}: ExerciseViewProps) {
  const options =
    (exercise.payload as { options?: ExerciseOption[] })?.options ?? [];
  const chosen = Array.isArray(value) ? (value as string[]) : [];
  const answer = Array.isArray(exercise.answer)
    ? (exercise.answer as string[])
    : [];
  return (
    <div className="space-y-1.5">
      {options.map((o) => {
        const picked = chosen.includes(o.id);
        const marked = !!grade;
        return (
          <OptionButton
            key={o.id}
            state={stateOf(
              picked,
              marked && answer.includes(o.id),
              marked && picked && !answer.includes(o.id)
            )}
            disabled={disabled}
            onClick={() =>
              onChange(
                picked ? chosen.filter((id) => id !== o.id) : [...chosen, o.id]
              )
            }
          >
            {optionLabel(o, support)}
          </OptionButton>
        );
      })}
    </div>
  );
}

/** Typing Russian on a Latin keyboard is impossible, so the keys come along. */
function TypeView({
  exercise,
  target,
  value,
  onChange,
  grade,
  disabled,
}: ExerciseViewProps) {
  const text = typeof value === 'string' ? value : '';
  // `||`, not `??`: an empty stored placeholder should still show the hint.
  const placeholder =
    (exercise.payload as { placeholder?: string })?.placeholder || 'Write it';
  return (
    <div className="space-y-2">
      <Input
        value={text}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
      />
      {!disabled && (
        <LetterKeys
          lang={target}
          onKey={(k: string) => onChange(text + k)}
          onBackspace={() => onChange(text.slice(0, -1))}
        />
      )}
      {grade && !grade.correct && (
        <p className="font-sans text-xs text-muted">
          {/* There may be several right forms; showing `[object Object]` or a
              comma-mangled array would be worse than showing nothing. */}
          {acceptedForms(exercise.answer).length > 1
            ? 'It could be '
            : 'The answer was '}
          <span className="text-fg">
            {acceptedForms(exercise.answer).join(' - ')}
          </span>
        </p>
      )}
    </div>
  );
}

function ListenView(props: ExerciseViewProps) {
  const path = (props.exercise.payload as { audioPath?: string })?.audioPath;
  return (
    <div className="space-y-2">
      {path && (
        <PlayButton
          bucket={BUCKETS.languageAudio}
          path={path}
          label="Play it again"
        />
      )}
      <TypeView {...props} />
    </div>
  );
}

/**
 * Fill the gaps. Each gap is its own little field, in the sentence - and the
 * letters his keyboard lacks appear for whichever gap he is in.
 */
function CompleteView({
  exercise,
  target,
  value,
  onChange,
  grade,
  disabled,
}: ExerciseViewProps) {
  const payload = exercise.payload as {
    template?: string;
    hints?: string[];
    why?: string[];
  };
  const template = payload?.template ?? '';
  const parts = splitTemplate(template);
  const answers = Array.isArray(value) ? (value as string[]) : [];
  const hints = payload?.hints ?? [];
  const why = payload?.why ?? [];
  const [gap, setGap] = useState<number | null>(null);
  // A DENSE array. Writing to index 2 of an empty array left holes, the
  // answer failed to parse, and filling the second gap correctly while
  // leaving the first blank scored zero with both boxes painted red.
  const set = (i: number, v: string) =>
    onChange(
      Array.from({ length: parts.length - 1 }, (_, k) =>
        k === i ? v : (answers[k] ?? '')
      )
    );
  // Wide enough for what is typed, never a 6rem box a long form scrolls in.
  const width = (i: number) =>
    `${Math.max(6, (answers[i] ?? hints[i] ?? '').length + 2)}ch`;
  return (
    <div className="space-y-1">
      <p className="flex flex-wrap items-center gap-1 font-sans text-sm leading-8 text-fg">
        {parts.map((part, i) => (
          <span key={i} className="contents">
            <span>{part}</span>
            {i < parts.length - 1 && (
              <input
                value={answers[i] ?? ''}
                disabled={disabled}
                onChange={(e) => set(i, e.target.value)}
                onFocus={() => setGap(i)}
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                placeholder={hints[i]}
                style={{ width: width(i) }}
                className={cn(
                  'rounded-md bg-surface-2 px-2 py-1 text-center font-sans text-sm text-fg outline-none placeholder:text-muted/60 focus:ring-1 focus:ring-gold',
                  grade?.detail?.[i] === true && 'bg-success/20',
                  grade?.detail?.[i] === false && 'bg-danger/20'
                )}
              />
            )}
          </span>
        ))}
      </p>
      {!disabled && gap !== null && gap < parts.length - 1 && (
        <LetterKeys
          lang={target}
          onKey={(k: string) => set(gap, (answers[gap] ?? '') + k)}
          onBackspace={() => set(gap, (answers[gap] ?? '').slice(0, -1))}
        />
      )}
      {grade && why.some(Boolean) && (
        <ul className="space-y-0.5 font-sans text-xs text-muted">
          {why.map((w, i) =>
            w ? (
              <li key={i}>
                <span
                  className={
                    grade.detail?.[i] === false ? 'text-danger' : 'text-success'
                  }
                >
                  {i + 1}.
                </span>{' '}
                {w}
              </li>
            ) : null
          )}
        </ul>
      )}
    </div>
  );
}

/**
 * Put the words in order - by TAPPING, not dragging.
 *
 * HTML5 drag-and-drop does not work on iOS, and a hand-rolled drag inside a
 * scrolling lesson fights the scroll. Tap a word to add it, tap it in the line
 * to take it back: same result, no gesture arbitration, and it works one-handed.
 */
function OrderView({
  exercise,
  value,
  onChange,
  grade,
  disabled,
}: ExerciseViewProps) {
  const tokens = (exercise.payload as { tokens?: string[] })?.tokens ?? [];
  const chosen = Array.isArray(value) ? (value as string[]) : [];
  const remaining = [...tokens];
  for (const t of chosen) {
    const i = remaining.indexOf(t);
    if (i >= 0) remaining.splice(i, 1);
  }

  return (
    <div className="space-y-2">
      {/* One tone up from the card it sits in - the same tone was invisible. */}
      <div className="flex min-h-[2.5rem] flex-wrap items-center gap-1.5 rounded-lg bg-surface-2 px-2 py-2">
        {chosen.length === 0 && (
          <span className="font-sans text-xs text-muted">
            Tap the words in order
          </span>
        )}
        {chosen.map((t, i) => (
          <button
            key={`${t}-${i}`}
            type="button"
            disabled={disabled}
            onClick={() => onChange(chosen.filter((_, k) => k !== i))}
            className={cn(
              'rounded-md px-2 py-1 font-sans text-sm',
              grade?.detail?.[i] === true
                ? 'bg-success/25 text-fg'
                : grade?.detail?.[i] === false
                  ? 'bg-danger/25 text-fg'
                  : 'bg-accent text-accent-fg'
            )}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {remaining.map((t, i) => (
          <button
            key={`${t}-${i}`}
            type="button"
            disabled={disabled}
            onClick={() => onChange([...chosen, t])}
            className="lift-press rounded-md bg-surface-2 px-2 py-1 font-sans text-sm text-fg"
          >
            {t}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Join the pairs: tap one side, then the other. */
function MatchView({
  exercise,
  value,
  onChange,
  grade,
  disabled,
}: ExerciseViewProps) {
  const pairs =
    (exercise.payload as { pairs?: { left: string; right: string }[] })
      ?.pairs ?? [];
  const joined = (value && typeof value === 'object' ? value : {}) as Record<
    string,
    string
  >;
  const [active, setActive] = useState<string | null>(null);

  // Mixed, and stable for this question: alphabetical order gave the pairs
  // away whenever she had typed them in alphabetical order. Two identical
  // right-hand cards stay distinct by index.
  const rights = pairs
    .map((p, i) => ({
      text: p.right,
      key: hash(`${exercise.id}:${i}:${p.right}`),
    }))
    .sort((a, b) => a.key - b.key)
    .map((r) => r.text);

  return (
    <div className="flex gap-2">
      <div className="flex-1 space-y-1.5">
        {pairs.map((p, i) => (
          <button
            key={p.left}
            type="button"
            disabled={disabled}
            onClick={() => setActive(active === p.left ? null : p.left)}
            className={cn(
              'w-full rounded-lg px-2.5 py-2 text-left font-sans text-sm',
              grade?.detail?.[i] === true
                ? 'bg-success/20'
                : grade?.detail?.[i] === false
                  ? 'bg-danger/20'
                  : active === p.left
                    ? 'bg-accent text-accent-fg'
                    : 'bg-surface-2'
            )}
          >
            <span className="block truncate">{p.left}</span>
            {joined[p.left] && (
              <span className="block truncate text-[0.68rem] text-muted">
                {joined[p.left]}
              </span>
            )}
          </button>
        ))}
      </div>
      <div className="flex-1 space-y-1.5">
        {rights.map((right, i) => {
          const takenBy = Object.entries(joined).find(([, v]) => v === right);
          return (
            <button
              key={`${right}-${i}`}
              type="button"
              disabled={disabled || !active}
              onClick={() => {
                if (!active) return;
                const next = { ...joined };
                // One right-hand card can only belong to one left-hand word.
                if (takenBy) delete next[takenBy[0]];
                next[active] = right;
                onChange(next);
                setActive(null);
              }}
              className={cn(
                'w-full rounded-lg px-2.5 py-2 text-left font-sans text-sm',
                takenBy ? 'bg-surface text-muted' : 'bg-surface-2 text-fg',
                !active && !takenBy && 'opacity-70'
              )}
            >
              <span className="block truncate">{right}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Say it out loud, then say whether you got it.
 *
 * Nothing in a browser can judge a Russian accent. Pretending otherwise would
 * be worse than trusting him - and she hears the recordings anyway.
 */
function SpeakView({ exercise, value, onChange, disabled }: ExerciseViewProps) {
  const path = (exercise.payload as { audioPath?: string })?.audioPath;
  const given = speakAnswer(value);
  const { upload } = useUpload();
  const [busy, setBusy] = useState(false);
  const [take, setTake] = useState(0);

  /**
   * His recording goes up the moment he stops. Until now "say it" was a
   * button he pressed alone in a room; now she hears him when she marks.
   */
  const recorded = async (clip: AudioClip | null) => {
    if (!clip) return;
    setBusy(true);
    try {
      const audio = storagePaths.languageSpeech(nanoid(10), clip.ext);
      await upload(BUCKETS.languageAudio, audio, clip.blob, {
        contentType: clip.mime,
        cacheControl: '31536000',
      });
      onChange({ ok: given.ok, audio });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const again = () => {
    if (given.audio)
      void supabase.storage.from(BUCKETS.languageAudio).remove([given.audio]);
    onChange({ ok: given.ok, audio: null });
    setTake((t) => t + 1);
  };

  return (
    <div className="space-y-2">
      {path && (
        <PlayButton
          bucket={BUCKETS.languageAudio}
          path={path}
          label="Hear how it sounds"
        />
      )}
      {given.audio ? (
        <div className="flex items-center gap-2">
          <PlayButton
            bucket={BUCKETS.languageAudio}
            path={given.audio}
            size="sm"
            label="Hear yourself"
          />
          <span className="min-w-0 flex-1 font-sans text-xs text-muted">
            Your recording - she hears it too.
          </span>
          {!disabled && (
            <button
              type="button"
              onClick={again}
              className="shrink-0 font-sans text-xs text-gold hover:underline"
            >
              again
            </button>
          )}
        </div>
      ) : disabled ? null : (
        <AudioRecorder resetKey={take} onRecorded={(c) => void recorded(c)} />
      )}
      {busy && (
        <p className="font-sans text-xs text-muted">Sending your voice…</p>
      )}
      <p className="flex items-center gap-1.5 font-sans text-xs text-muted">
        <Mic className="h-3.5 w-3.5" /> Say it out loud, then mark yourself.
      </p>
      <div className="flex gap-2">
        <Button
          full
          variant={given.ok === true ? 'primary' : 'secondary'}
          disabled={disabled}
          onClick={() => onChange({ ok: true, audio: given.audio })}
        >
          Got it
        </Button>
        <Button
          full
          variant={given.ok === false ? 'danger' : 'secondary'}
          disabled={disabled}
          onClick={() => onChange({ ok: false, audio: given.audio })}
        >
          Not yet
        </Button>
      </div>
    </div>
  );
}
