import { useState } from 'react';
import { Check, Mic, X } from 'lucide-react';
import { cn } from '@kernel/lib';
import { BUCKETS } from '@kernel/storage';
import { Button, Input, PlayButton } from '@kernel/ui';
import type { Exercise, SupportLang } from '../../types';
import {
  splitTemplate,
  type ExerciseOption,
  type Grade,
} from '../../lib/exercise-schema';
import { pick } from '../../lib/pick';
import { CyrillicKeys } from '../cyrillic-keys';

/** An option reads in the language you learn in, falling back like everything else. */
function optionLabel(o: ExerciseOption, support: SupportLang): string {
  const order = support === 'es' ? [o.es, o.en, o.ru] : [o.en, o.es, o.ru];
  return order.find((v) => v && v.trim()) ?? '';
}

export interface ExerciseViewProps {
  exercise: Exercise;
  support: SupportLang;
  /** The answer so far. Owned by the runner so it survives a re-render. */
  value: unknown;
  onChange: (value: unknown) => void;
  /** Set once marked — the view then shows what was right. */
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

/** The shared look of a tappable answer. */
function Choice({
  label,
  picked,
  right,
  wrong,
  disabled,
  onClick,
}: {
  label: string;
  picked: boolean;
  right?: boolean;
  wrong?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'lift-press flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left font-sans text-sm transition',
        right
          ? 'bg-success/20 text-fg'
          : wrong
            ? 'bg-danger/20 text-fg'
            : picked
              ? 'bg-accent text-accent-fg'
              : 'bg-surface-2 text-fg'
      )}
    >
      {right && <Check className="h-4 w-4 shrink-0 text-success" />}
      {wrong && <X className="h-4 w-4 shrink-0 text-danger" />}
      <span className="min-w-0 flex-1">{label}</span>
    </button>
  );
}

function ChoiceView({
  exercise,
  support,
  value,
  onChange,
  grade,
  disabled,
}: ExerciseViewProps) {
  const options =
    (exercise.payload as { options?: ExerciseOption[] })?.options ?? [];
  return (
    <div className="space-y-1.5">
      {options.map((o) => {
        const picked = value === o.id;
        const marked = !!grade;
        return (
          <Choice
            key={o.id}
            label={optionLabel(o, support)}
            picked={picked}
            right={marked && o.id === exercise.answer}
            wrong={marked && picked && o.id !== exercise.answer}
            disabled={disabled}
            onClick={() => onChange(o.id)}
          />
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
          <Choice
            key={o.id}
            label={optionLabel(o, support)}
            picked={picked}
            right={marked && answer.includes(o.id)}
            wrong={marked && picked && !answer.includes(o.id)}
            disabled={disabled}
            onClick={() =>
              onChange(
                picked ? chosen.filter((id) => id !== o.id) : [...chosen, o.id]
              )
            }
          />
        );
      })}
    </div>
  );
}

/** Typing Russian on a Latin keyboard is impossible, so the keys come along. */
function TypeView({
  exercise,
  value,
  onChange,
  grade,
  disabled,
}: ExerciseViewProps) {
  const text = typeof value === 'string' ? value : '';
  const placeholder =
    (exercise.payload as { placeholder?: string })?.placeholder ?? 'Write it';
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
        <CyrillicKeys
          onKey={(k) => onChange(text + k)}
          onBackspace={() => onChange(text.slice(0, -1))}
        />
      )}
      {grade && !grade.correct && (
        <p className="font-sans text-xs text-muted">
          The answer was{' '}
          <span className="text-fg">{String(exercise.answer)}</span>
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

/** Fill the gaps. Each gap is its own little field, in the sentence. */
function CompleteView({
  exercise,
  value,
  onChange,
  grade,
  disabled,
}: ExerciseViewProps) {
  const template = (exercise.payload as { template?: string })?.template ?? '';
  const parts = splitTemplate(template);
  const answers = Array.isArray(value) ? (value as string[]) : [];

  return (
    <p className="flex flex-wrap items-center gap-1 font-sans text-sm leading-8 text-fg">
      {parts.map((part, i) => (
        <span key={i} className="contents">
          <span>{part}</span>
          {i < parts.length - 1 && (
            <input
              value={answers[i] ?? ''}
              disabled={disabled}
              onChange={(e) => {
                const next = [...answers];
                next[i] = e.target.value;
                onChange(next);
              }}
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              className={cn(
                'w-24 rounded-md bg-surface-2 px-2 py-1 text-center font-sans text-sm text-fg outline-none',
                grade?.detail?.[i] === true && 'bg-success/20',
                grade?.detail?.[i] === false && 'bg-danger/20'
              )}
            />
          )}
        </span>
      ))}
    </p>
  );
}

/**
 * Put the words in order — by TAPPING, not dragging.
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
      <div className="flex min-h-[2.5rem] flex-wrap items-center gap-1.5 rounded-lg bg-surface px-2 py-2">
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

  const rights = [...pairs.map((p) => p.right)].sort((a, b) =>
    a.localeCompare(b)
  );

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
        {rights.map((right) => {
          const takenBy = Object.entries(joined).find(([, v]) => v === right);
          return (
            <button
              key={right}
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
 * be worse than trusting him — and she hears the recordings anyway.
 */
function SpeakView({ exercise, value, onChange, disabled }: ExerciseViewProps) {
  const path = (exercise.payload as { audioPath?: string })?.audioPath;
  return (
    <div className="space-y-2">
      {path && (
        <PlayButton
          bucket={BUCKETS.languageAudio}
          path={path}
          label="Hear how it sounds"
        />
      )}
      <p className="flex items-center gap-1.5 font-sans text-xs text-muted">
        <Mic className="h-3.5 w-3.5" /> Say it out loud, then mark yourself.
      </p>
      <div className="flex gap-2">
        <Button
          full
          variant={value === true ? 'primary' : 'secondary'}
          disabled={disabled}
          onClick={() => onChange(true)}
        >
          Got it
        </Button>
        <Button
          full
          variant={value === false ? 'danger' : 'secondary'}
          disabled={disabled}
          onClick={() => onChange(false)}
        >
          Not yet
        </Button>
      </div>
    </div>
  );
}
