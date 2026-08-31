import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { nanoid } from 'nanoid';
import {
  AudioRecorder,
  Button,
  Field,
  Input,
  PlayButton,
  Segmented,
  Sheet,
  Textarea,
  toast,
  type AudioClip,
} from '@kernel/ui';
import { BUCKETS, storagePaths, useUpload } from '@kernel/storage';
import { useSaveExercise } from '../../api/lessons.mutations';
import { useLanguages } from '../../lib/languages';
import {
  acceptedForms,
  gapCount,
  scrambleTokens,
  validateExercise,
  type ExerciseOption,
} from '../../lib/exercise-schema';
import type { Exercise, ExerciseKind, Lang } from '../../types';

/**
 * Read a list of acceptable answers out of one field.
 *
 * Russian rarely has exactly one right way to say something, so she can write
 * the alternatives and every one of them will be marked correct.
 */
function splitAnswers(text: string, sep = '/'): string[] {
  return text
    .split(sep)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** The prompt goes under the language it was written in — all three exist. */
function promptPatch(lang: Lang, prompt: string) {
  const value = prompt || null;
  if (lang === 'ru') return { prompt_ru: value };
  if (lang === 'es') return { prompt_es: value };
  return { prompt_en: value };
}

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
  target,
  onClose,
}: {
  open: boolean;
  lessonId: string;
  position: number;
  exercise: Exercise | null;
  /** The language the lesson teaches — the one the answer options are in. */
  target: Lang;
  onClose: () => void;
}) {
  const save = useSaveExercise();
  const { upload, uploading } = useUpload();
  const { native: support } = useLanguages();

  const [kind, setKind] = useState<ExerciseKind>('choice');
  const [prompt, setPrompt] = useState('');
  const [options, setOptions] = useState<ExerciseOption[]>([
    { id: nanoid(4), ru: '' },
    { id: nanoid(4), ru: '' },
  ]);
  const [correct, setCorrect] = useState<string[]>([]);
  const [text, setText] = useState('');
  const [answerText, setAnswerText] = useState('');
  const [audio, setAudio] = useState<AudioClip | null>(null);
  const [audioPath, setAudioPath] = useState<string | null>(null);

  useEffect(() => {
    if (!exercise) return;
    setKind(exercise.kind as ExerciseKind);
    // This language's prompt, or nothing. Falling back to another language
    // read well and then SAVED that text under this one on the next save —
    // a Russian prompt quietly became the English prompt too.
    setPrompt(exercise[`prompt_${support}`] ?? '');
    const payload = exercise.payload as Record<string, unknown>;
    if (payload?.options) setOptions(payload.options as ExerciseOption[]);
    setAudioPath((payload?.audioPath as string) ?? null);
    if (payload?.template) setText(String(payload.template));
    if (exercise.kind === 'order') {
      // From the ANSWER, never from the pool: the pool is stored jumbled on
      // purpose, and seeding from it made every reopen-and-save promote the
      // jumble to the correct sentence.
      const answer = exercise.answer as unknown;
      const first =
        Array.isArray(answer) && Array.isArray(answer[0]) ? answer[0] : answer;
      if (Array.isArray(first)) setText((first as string[]).join(' '));
    }
    if (payload?.pairs) {
      // Back into the shape she typed, so a match question can be corrected
      // instead of retyped — it used to open empty and refuse to save.
      setText(
        (payload.pairs as { left: string; right: string }[])
          .map((p) => `${p.left} = ${p.right}`)
          .join('\n')
      );
    }
    if (exercise.kind === 'multi') {
      setCorrect((exercise.answer as string[]) ?? []);
    } else if (exercise.kind === 'choice') {
      setCorrect([exercise.answer as string]);
    } else if (exercise.kind === 'complete') {
      // Gaps are separated by |, alternatives within a gap by /.
      setAnswerText(
        ((exercise.answer as unknown[]) ?? [])
          .map((gap) => acceptedForms(gap).join(' / '))
          .join(' | ')
      );
    } else {
      setAnswerText(acceptedForms(exercise.answer).join(' / '));
    }
    // Seeded from the exercise ONLY. `support` used to be a dependency, so
    // changing the language in the top bar mid-edit threw away everything she
    // had typed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exercise?.id]);

  /** Turn the form into the shapes `exercise-schema` expects. */
  const buildWith = (
    audioPath: string | null
  ): { payload: unknown; answer: unknown } => {
    switch (kind) {
      case 'choice':
        return { payload: { options }, answer: correct[0] ?? '' };
      case 'multi':
        return { payload: { options }, answer: correct };
      case 'type':
        // No empty placeholder: `??` keeps '' and the field loses its hint.
        return { payload: {}, answer: splitAnswers(answerText) };
      case 'listen':
        return { payload: { audioPath }, answer: splitAnswers(answerText) };
      case 'complete':
        // One entry per gap, and each gap may itself offer alternatives —
        // "живу / проживаю | Москве".
        return {
          payload: { template: text },
          answer: answerText.split('|').map((gap) => splitAnswers(gap, '/')),
        };
      case 'order': {
        const tokens = text.split(/\s+/).filter(Boolean);
        // The pool is JUMBLED and the answer keeps her order. Storing both the
        // same way is what made the exercise solvable by tapping left to right.
        return { payload: { tokens: scrambleTokens(tokens) }, answer: tokens };
      }
      case 'match': {
        // Split on the FIRST "=" only — a right-hand side may contain one.
        const pairs = text
          .split('\n')
          .map((line) => {
            const at = line.indexOf('=');
            if (at < 0) return null;
            const left = line.slice(0, at).trim();
            const right = line.slice(at + 1).trim();
            return left && right ? { left, right } : null;
          })
          .filter((p): p is { left: string; right: string } => p !== null);
        return {
          payload: { pairs },
          answer: Object.fromEntries(pairs.map((p) => [p.left, p.right])),
        };
      }
      case 'speak':
        return { payload: { audioPath }, answer: null };
    }
  };

  const needsAudio = kind === 'listen' || kind === 'speak';

  /**
   * A different shape starts clean.
   *
   * Switching Choose → Match and back used to carry the old option ids and
   * answers along, and they were saved with the new question.
   */
  const changeKind = (next: ExerciseKind) => {
    if (next === kind) return;
    setKind(next);
    setOptions([{ id: nanoid(4) }, { id: nanoid(4) }]);
    setCorrect([]);
    setText('');
    setAnswerText('');
  };

  const submit = async () => {
    // The recording has to exist in storage before the question can point at it.
    let path = audioPath;
    if (needsAudio && audio) {
      path = storagePaths.languageAudio(`exercise/${nanoid(10)}`, audio.ext);
      await upload(BUCKETS.languageAudio, path, audio.blob, {
        contentType: audio.mime,
      });
      setAudioPath(path);
    }
    const { payload, answer } = buildWith(path);
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
        ...promptPatch(support, prompt),
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
          onChange={(v) => changeKind(v as ExerciseKind)}
          options={KINDS.slice(0, 4)}
        />
        <Segmented
          full
          value={kind}
          onChange={(v) => changeKind(v as ExerciseKind)}
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
                  // In the language being taught — a Spanish course's options
                  // are Spanish, not Russian.
                  value={o[target] ?? ''}
                  onChange={(e) =>
                    setOptions((os) =>
                      os.map((x, k) =>
                        k === i ? { ...x, [target]: e.target.value } : x
                      )
                    )
                  }
                  placeholder={`Option ${i + 1}`}
                />
                <button
                  type="button"
                  aria-label="Remove option"
                  onClick={() => {
                    setOptions((os) => os.filter((_, k) => k !== i));
                    // Or the question keeps a right answer nobody can pick.
                    setCorrect((c) => c.filter((x) => x !== o.id));
                  }}
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
              hint={`One per gap with | — ${gapCount(text)} needed. Alternatives with /`}
            >
              <Input
                value={answerText}
                onChange={(e) => setAnswerText(e.target.value)}
                placeholder="живу / проживаю | Москве"
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

        {needsAudio && (
          <Field
            label={
              kind === 'listen' ? 'What he will hear' : 'How it should sound'
            }
            hint="In your voice — that is the point"
          >
            <div className="space-y-2">
              {audioPath && !audio && (
                <PlayButton
                  bucket={BUCKETS.languageAudio}
                  path={audioPath}
                  size="sm"
                  label="What is on it now"
                />
              )}
              <AudioRecorder onRecorded={setAudio} />
            </div>
          </Field>
        )}

        {(kind === 'type' || kind === 'listen') && (
          <Field
            label="The answer"
            hint="More than one right way? Separate them with /"
          >
            <Input
              value={answerText}
              onChange={(e) => setAnswerText(e.target.value)}
              placeholder="спасибо / благодарю"
            />
          </Field>
        )}

        <Button
          full
          onClick={() => void submit()}
          disabled={save.isPending || uploading}
        >
          {exercise ? 'Save' : 'Add the question'}
        </Button>
      </div>
    </Sheet>
  );
}
