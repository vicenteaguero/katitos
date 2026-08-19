import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { nanoid } from 'nanoid';
import {
  Button,
  Field,
  Input,
  Segmented,
  Sheet,
  Textarea,
  toast,
} from '@kernel/ui';
import { useSaveExercise } from '../../api/lessons.mutations';
import { useLangPrefs } from '../../lib/lang-prefs';
import {
  gapCount,
  validateExercise,
  type ExerciseOption,
} from '../../lib/exercise-schema';
import type { Exercise, ExerciseKind } from '../../types';

const KINDS: { value: ExerciseKind; label: string }[] = [
  { value: 'choice', label: 'Choose' },
  { value: 'multi', label: 'Choose several' },
  { value: 'type', label: 'Type it' },
  { value: 'complete', label: 'Fill the gaps' },
  { value: 'order', label: 'Put in order' },
  { value: 'match', label: 'Match' },
  { value: 'listen', label: 'Listen' },
  { value: 'speak', label: 'Say it' },
];

/**
 * Writing a question, on a phone.
 *
 * Everything is checked with the same `validateExercise` the runner uses before
 * it is allowed to save — an exercise with three gaps and two answers cannot be
 * marked, and finding that out while teaching is not acceptable.
 */
export function ExerciseEditor({
  open,
  lessonId,
  position,
  exercise,
  onClose,
}: {
  open: boolean;
  lessonId: string;
  position: number;
  exercise: Exercise | null;
  onClose: () => void;
}) {
  const save = useSaveExercise();
  const support = useLangPrefs((s) => s.supportLang);

  const [kind, setKind] = useState<ExerciseKind>('choice');
  const [prompt, setPrompt] = useState('');
  const [options, setOptions] = useState<ExerciseOption[]>([
    { id: nanoid(4), ru: '' },
    { id: nanoid(4), ru: '' },
  ]);
  const [correct, setCorrect] = useState<string[]>([]);
  const [text, setText] = useState('');
  const [answerText, setAnswerText] = useState('');

  useEffect(() => {
    if (!exercise) return;
    setKind(exercise.kind as ExerciseKind);
    setPrompt(
      (support === 'es' ? exercise.prompt_es : exercise.prompt_en) ??
        exercise.prompt_ru ??
        ''
    );
    const payload = exercise.payload as Record<string, unknown>;
    if (payload?.options) setOptions(payload.options as ExerciseOption[]);
    if (payload?.template) setText(String(payload.template));
    if (payload?.tokens) setText((payload.tokens as string[]).join(' '));
    if (Array.isArray(exercise.answer)) {
      const arr = exercise.answer as string[];
      if (exercise.kind === 'multi') setCorrect(arr);
      else setAnswerText(arr.join(' | '));
    } else if (typeof exercise.answer === 'string') {
      if (exercise.kind === 'choice') setCorrect([exercise.answer]);
      else setAnswerText(exercise.answer);
    }
  }, [exercise, support]);

  /** Turn the form into the shapes `exercise-schema` expects. */
  const build = (): { payload: unknown; answer: unknown } => {
    switch (kind) {
      case 'choice':
        return { payload: { options }, answer: correct[0] ?? '' };
      case 'multi':
        return { payload: { options }, answer: correct };
      case 'type':
        return { payload: { placeholder: '' }, answer: answerText.trim() };
      case 'listen':
        return { payload: { audioPath: null }, answer: answerText.trim() };
      case 'complete':
        return {
          payload: { template: text },
          answer: answerText.split('|').map((s) => s.trim()),
        };
      case 'order': {
        const tokens = text.split(/\s+/).filter(Boolean);
        return { payload: { tokens }, answer: tokens };
      }
      case 'match': {
        const pairs = text
          .split('\n')
          .map((line) => line.split('=').map((s) => s.trim()))
          .filter(([l, r]) => l && r)
          .map(([left, right]) => ({ left, right }));
        return {
          payload: { pairs },
          answer: Object.fromEntries(pairs.map((p) => [p.left, p.right])),
        };
      }
      case 'speak':
        return { payload: { audioPath: null }, answer: null };
    }
  };

  const submit = () => {
    const { payload, answer } = build();
    const problem = validateExercise({ kind, payload, answer });
    if (problem) {
      toast.error(problem);
      return;
    }
    save.mutate(
      {
        id: exercise?.id,
        lessonId,
        kind,
        position: exercise?.position ?? position,
        ...(support === 'es'
          ? { prompt_es: prompt || null }
          : { prompt_en: prompt || null }),
        payload,
        answer,
      },
      { onSuccess: onClose }
    );
  };

  const optionsKind = kind === 'choice' || kind === 'multi';

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={exercise ? 'This question' : 'New question'}
      size="full"
    >
      <div className="space-y-3">
        <Segmented
          full
          value={kind}
          onChange={(v) => setKind(v as ExerciseKind)}
          options={KINDS.slice(0, 4)}
        />
        <Segmented
          full
          value={kind}
          onChange={(v) => setKind(v as ExerciseKind)}
          options={KINDS.slice(4)}
        />

        <Field label="Ask him">
          <Input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="What does this mean?"
          />
        </Field>

        {optionsKind && (
          <div className="space-y-1.5">
            {options.map((o, i) => (
              <div key={o.id} className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label="Mark as correct"
                  onClick={() =>
                    setCorrect((c) =>
                      kind === 'choice'
                        ? [o.id]
                        : c.includes(o.id)
                          ? c.filter((x) => x !== o.id)
                          : [...c, o.id]
                    )
                  }
                  className={
                    correct.includes(o.id)
                      ? 'h-6 w-6 shrink-0 rounded-full bg-accent'
                      : 'h-6 w-6 shrink-0 rounded-full bg-surface-2'
                  }
                />
                <Input
                  value={o.ru ?? ''}
                  onChange={(e) =>
                    setOptions((os) =>
                      os.map((x, k) =>
                        k === i ? { ...x, ru: e.target.value } : x
                      )
                    )
                  }
                  placeholder={`Option ${i + 1}`}
                />
                <button
                  type="button"
                  aria-label="Remove option"
                  onClick={() =>
                    setOptions((os) => os.filter((_, k) => k !== i))
                  }
                  className="shrink-0 text-muted"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            <Button
              size="sm"
              variant="secondary"
              onClick={() =>
                setOptions((os) => [...os, { id: nanoid(4), ru: '' }])
              }
            >
              <Plus size={13} /> Option
            </Button>
          </div>
        )}

        {kind === 'complete' && (
          <>
            <Field
              label="The sentence"
              hint="Put {{1}} and {{2}} where the gaps go"
            >
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={2}
                placeholder="Я {{1}} в {{2}}"
              />
            </Field>
            <Field
              label="The answers"
              hint={`Separate with | — ${gapCount(text)} needed`}
            >
              <Input
                value={answerText}
                onChange={(e) => setAnswerText(e.target.value)}
                placeholder="живу | Москве"
              />
            </Field>
          </>
        )}

        {kind === 'order' && (
          <Field label="The sentence, in the right order">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={2}
              placeholder="я тебя люблю"
            />
          </Field>
        )}

        {kind === 'match' && (
          <Field label="The pairs" hint="One per line: вода = water">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              placeholder={'вода = water\nхлеб = bread'}
            />
          </Field>
        )}

        {(kind === 'type' || kind === 'listen') && (
          <Field label="The answer">
            <Input
              value={answerText}
              onChange={(e) => setAnswerText(e.target.value)}
              placeholder="спасибо"
            />
          </Field>
        )}

        <Button full onClick={submit} disabled={save.isPending}>
          {exercise ? 'Save' : 'Add the question'}
        </Button>
      </div>
    </Sheet>
  );
}
