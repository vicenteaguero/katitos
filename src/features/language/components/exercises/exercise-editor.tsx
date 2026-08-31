import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { nanoid } from 'nanoid';
import {
  Button,
  Dialog,
  Field,
  Input,
  Textarea,
  toast,
  type AudioClip,
} from '@kernel/ui';
import { BUCKETS, storagePaths, useUpload } from '@kernel/storage';
import { supabase } from '@kernel/supabase';
import { useSaveExercise } from '../../api/lessons.mutations';
import { AudioField, ExerciseKindGallery } from '../kit';
import { useLanguages } from '../../lib/languages';
import { stressVariants } from '../../lib/stress';
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
  blockId = null,
  onClose,
}: {
  open: boolean;
  lessonId: string;
  position: number;
  exercise: Exercise | null;
  /** The language the lesson teaches — the one the answer options are in. */
  target: Lang;
  /** The block this question follows — or none, for one at the end. */
  blockId?: string | null;
  onClose: () => void;
}) {
  const save = useSaveExercise();
  const { upload, uploading } = useUpload();
  const { native: support } = useLanguages();

  const [kind, setKind] = useState<ExerciseKind>('choice');
  // Choose, asked as "where is the stress?" — the options are made for her.
  const [variant, setVariant] = useState<'stress' | 'pair' | null>(null);
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
  const [points, setPoints] = useState('1');
  // Fill-the-gap only: what to print under each blank, and why the form.
  const [hints, setHints] = useState('');
  const [why, setWhy] = useState('');

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
    setPoints(String(exercise.points ?? 1));
    if (payload?.template) setText(String(payload.template));
    setHints(((payload?.hints as string[] | undefined) ?? []).join(' | '));
    setWhy(((payload?.why as string[] | undefined) ?? []).join(' | '));
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
    if (payload?.variant === 'stress' || payload?.variant === 'pair') {
      setVariant(payload.variant);
      const opts = (payload.options as ExerciseOption[] | undefined) ?? [];
      const label = (o: ExerciseOption) => o[target] ?? o.ru ?? '';
      const right = opts.find((o) => o.id === exercise.answer);
      setAnswerText(right ? label(right) : '');
      if (payload.variant === 'pair')
        setText(
          opts
            .filter((o) => o !== right)
            .map(label)
            .join('\n')
        );
    } else {
      setVariant(null);
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
      case 'choice': {
        if (variant === 'pair') {
          // Her word first, its lookalikes after; the reader shuffles nothing —
          // the order is stable and the answer is by id.
          const words = [
            answerText.trim(),
            ...text
              .split('\n')
              .map((l) => l.trim())
              .filter(Boolean),
          ];
          const opts = words.map((w, k) => ({ id: `p${k}`, [target]: w }));
          return {
            payload: { options: opts, variant: 'pair', audioPath },
            answer: opts[0]?.id ?? '',
          };
        }
        if (variant === 'stress') {
          const { variants, answer } = stressVariants(answerText);
          const opts = variants.map((v, k) => ({ id: `s${k}`, [target]: v }));
          return {
            payload: { options: opts, variant: 'stress' },
            answer: answer >= 0 ? opts[answer].id : '',
          };
        }
        return { payload: { options }, answer: correct[0] ?? '' };
      }
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
          payload: {
            template: text,
            ...(hints.trim()
              ? { hints: hints.split('|').map((h) => h.trim()) }
              : {}),
            ...(why.trim() ? { why: why.split('|').map((h) => h.trim()) } : {}),
          },
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

  const needsAudio =
    kind === 'listen' || kind === 'speak' || variant === 'pair';

  /**
   * A different shape starts clean.
   *
   * Switching Choose → Match and back used to carry the old option ids and
   * answers along, and they were saved with the new question.
   */
  const changeKind = (next: ExerciseKind) => {
    if (next === kind) return;
    const between = (a: ExerciseKind, b: ExerciseKind) =>
      (kind === a && next === b) || (kind === b && next === a);
    setKind(next);
    // Choose and Choose-several share their options — one tap between them
    // used to wipe every option she had typed. A typed answer survives
    // Type ↔ Listen the same way.
    if (between('choice', 'multi')) {
      if (next === 'choice') setCorrect((c) => c.slice(0, 1));
      return;
    }
    if (between('type', 'listen')) return;
    setOptions([{ id: nanoid(4) }, { id: nanoid(4) }]);
    setCorrect([]);
    setText('');
    setAnswerText('');
    setHints('');
    setWhy('');
  };

  const submit = async () => {
    // The recording has to exist in storage before the question can point at it.
    let path = audioPath;
    if (needsAudio && audio) {
      path = storagePaths.languageAudio(`exercise/${nanoid(10)}`, audio.ext);
      await upload(BUCKETS.languageAudio, path, audio.blob, {
        contentType: audio.mime,
        cacheControl: '31536000',
      });
      setAudioPath(path);
      // Uploaded once: a second press of Save must not send it again.
      setAudio(null);
    }
    // The clip this one replaces is nobody's — once the save has gone
    // through. Removing it first meant a refused save left the question
    // pointing at a recording that no longer existed.
    const stored =
      (exercise?.payload as { audioPath?: string } | null)?.audioPath ?? null;
    if (variant === 'pair' && !path) {
      toast.error('Record the word — the whole question is your voice');
      return;
    }
    if (variant === 'stress' && stressVariants(answerText).answer < 0) {
      toast.error('Put the accent on a vowel — спаси́бо');
      return;
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
        blockId: exercise ? exercise.block_id : blockId,
        points: Math.max(0, Number(points) || 1),
        ...promptPatch(
          support,
          prompt ||
            (variant === 'stress'
              ? 'Where is the stress?'
              : variant === 'pair'
                ? 'Which one did you hear?'
                : '')
        ),
        payload,
        answer,
      },
      {
        onSuccess: () => {
          if (stored && stored !== path)
            void supabase.storage.from(BUCKETS.languageAudio).remove([stored]);
          onClose();
        },
      }
    );
  };

  const optionsKind = kind === 'choice' || kind === 'multi';

  return (
    <Dialog
      placement="auto"
      open={open}
      onClose={onClose}
      title={exercise ? 'This question' : 'New question'}
      size="md"
    >
      <div className="space-y-3">
        <ExerciseKindGallery
          value={variant ?? kind}
          onChange={(v) => {
            if (v === 'stress' || v === 'pair') {
              changeKind('choice');
              setVariant(v);
            } else {
              setVariant(null);
              changeKind(v);
            }
          }}
        />

        <Field label="Ask him">
          <Input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="What does this mean?"
          />
        </Field>

        {variant === 'stress' && (
          <Field
            label="The word, with its stress"
            hint="Type the accent on the stressed vowel — спаси́бо. He is offered every vowel."
          >
            <Input
              value={answerText}
              onChange={(e) => setAnswerText(e.target.value)}
              placeholder="спаси́бо"
              className="font-display text-lg"
            />
          </Field>
        )}

        {variant === 'pair' && (
          <>
            <Field
              label="The word you say"
              hint="Recorded below — he hears it and picks"
            >
              <Input
                value={answerText}
                onChange={(e) => setAnswerText(e.target.value)}
                placeholder="дом"
                className="font-display text-lg"
              />
            </Field>
            <Field
              label="Its lookalikes"
              hint="One per line — the words it is easy to mistake it for"
            >
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={2}
                placeholder={'том\nдым'}
              />
            </Field>
          </>
        )}

        {optionsKind && variant !== 'stress' && variant !== 'pair' && (
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
                  // are Spanish, not Russian. Read with a fallback: every
                  // option written before this was filed under `ru` whatever
                  // the course, and opened as an empty box.
                  value={o[target] ?? o.ru ?? o.en ?? o.es ?? ''}
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
              size="xs"
              variant="secondary"
              onClick={() => setOptions((os) => [...os, { id: nanoid(4) }])}
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
            <Field
              label="Under each gap"
              hint="The word in brackets, the case wanted — one per gap with |"
            >
              <Input
                value={hints}
                onChange={(e) => setHints(e.target.value)}
                placeholder="(жить) | (Москва, prep.)"
              />
            </Field>
            <Field
              label="Why"
              hint="Shown after he answers — one per gap with |"
            >
              <Input
                value={why}
                onChange={(e) => setWhy(e.target.value)}
                placeholder="я → -у | в + prepositional → -е"
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
          <AudioField
            label={
              kind === 'listen' ? 'What he will hear' : 'How it should sound'
            }
            hint="In your voice — that is the point"
            currentPath={audioPath}
            onClip={setAudio}
          />
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

        <Field
          label="Worth"
          hint="Points out of the lesson — 1 unless it matters more"
        >
          <Input
            value={points}
            onChange={(e) => setPoints(e.target.value.replace(/[^\d]/g, ''))}
            inputMode="numeric"
            placeholder="1"
            className="w-24"
          />
        </Field>

        <Button
          full
          onClick={() => void submit()}
          disabled={save.isPending || uploading}
        >
          {exercise ? 'Save' : 'Add the question'}
        </Button>
      </div>
    </Dialog>
  );
}
