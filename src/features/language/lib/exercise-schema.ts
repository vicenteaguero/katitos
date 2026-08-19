import { z } from 'zod';
import { answerMatches } from './answer-match';
import type { ExerciseKind } from '../types';

/**
 * What each kind of exercise is made of, and what counts as getting it right.
 *
 * The shapes live in `payload` (jsonb) rather than in columns, and are checked
 * HERE rather than by the database — deliberately. The service worker means a
 * migration can never be assumed to have reached both phones, so a ninth kind
 * of exercise has to be addable without one. The price is that this file must
 * be strict, which is why every branch below is unit-tested.
 */

/** One option, in all three languages — the same trilingual rule as prose. */
export const optionSchema = z.object({
  id: z.string().min(1),
  ru: z.string().optional().nullable(),
  en: z.string().optional().nullable(),
  es: z.string().optional().nullable(),
});
export type ExerciseOption = z.infer<typeof optionSchema>;

export const payloadSchemas = {
  /** Pick exactly one. */
  choice: z.object({ options: z.array(optionSchema).min(2) }),
  /** Pick every one that applies. */
  multi: z.object({ options: z.array(optionSchema).min(2) }),
  /** Write it out. */
  type: z.object({ placeholder: z.string().optional() }),
  /**
   * Fill the gaps. The sentence carries `{{1}}`, `{{2}}` markers, and there
   * must be one answer per marker or the exercise cannot be marked.
   */
  complete: z.object({ template: z.string().min(1) }),
  /** Put the words in the right order. */
  order: z.object({ tokens: z.array(z.string().min(1)).min(2) }),
  /** Join each left to its right. */
  match: z.object({
    pairs: z
      .array(z.object({ left: z.string().min(1), right: z.string().min(1) }))
      .min(2),
  }),
  /**
   * Hear it, then write what you heard. The recording is the whole exercise,
   * so it is required — a listening question with nothing to listen to is just
   * a typing question with no prompt.
   */
  listen: z.object({ audioPath: z.string().min(1) }),
  /** Say it out loud and mark yourself — nothing else here would be honest. */
  speak: z.object({ audioPath: z.string().optional().nullable() }),
} as const;

/**
 * A written answer may have several right forms.
 *
 * Russian makes this compulsory rather than nice-to-have: "I have a sister"
 * is у меня есть сестра or у меня сестра, and half the vocabulary has a
 * synonym she would happily accept. One stored string means marking a correct
 * answer wrong, which is the fastest way to make a learner stop trusting the
 * app.
 */
const writtenAnswer = z.union([
  z.string().min(1),
  z.array(z.string().min(1)).min(1),
]);

export const answerSchemas = {
  choice: z.string().min(1),
  // At least one right answer, or the question can never be got right.
  multi: z.array(z.string()).min(1),
  type: writtenAnswer,
  complete: z.array(writtenAnswer),
  order: z.array(z.string()),
  match: z.record(z.string(), z.string()),
  listen: writtenAnswer,
  speak: z.boolean(),
} as const;

/** Every form she is willing to accept for one written answer. */
export function acceptedForms(answer: unknown): string[] {
  if (typeof answer === 'string') return [answer];
  if (Array.isArray(answer)) return answer.filter((a): a is string => !!a);
  return [];
}

/** Does what he wrote match ANY of the forms she accepts? */
function matchesAny(given: string, answer: unknown): boolean {
  const forms = acceptedForms(answer);
  return forms.length > 0 && forms.some((form) => answerMatches(given, form));
}

export interface ExerciseLike {
  kind: ExerciseKind | string;
  payload: unknown;
  answer: unknown;
  points?: number | null;
}

export interface Grade {
  correct: boolean;
  /** 0..1 — partial credit where partial credit is meaningful. */
  score: number;
  /** Per-item verdicts, for showing WHICH gap was wrong. */
  detail?: boolean[];
}

const WRONG: Grade = { correct: false, score: 0 };

/** How many gaps a fill-in sentence has. */
export function gapCount(template: string): number {
  return (template.match(/\{\{\s*\d+\s*\}\}/g) ?? []).length;
}

/** Split a template into the text around its gaps: n gaps gives n+1 pieces. */
export function splitTemplate(template: string): string[] {
  return template.split(/\{\{\s*\d+\s*\}\}/);
}

/**
 * Jumble the words of a put-in-order question.
 *
 * Without this the pool is stored — and therefore shown — in the answer's own
 * order, so the exercise is solved by tapping left to right. Deterministic on
 * purpose (same sentence, same jumble): the alternative reshuffles under the
 * learner's fingers on every render, and it could not be tested.
 */
export function scrambleTokens(tokens: readonly string[]): string[] {
  if (tokens.length < 2) return [...tokens];
  // Interleave from both ends, then rotate: cheap, stable, and for any real
  // sentence it moves every word off its answer position.
  const out: string[] = [];
  for (let i = 0, j = tokens.length - 1; i <= j; i++, j--) {
    out.push(tokens[j]);
    if (i !== j) out.push(tokens[i]);
  }
  // A two-word sentence can only be swapped; anything longer must not come
  // back identical to the answer.
  if (out.join('\u0000') === tokens.join('\u0000')) {
    return [...tokens.slice(1), tokens[0]];
  }
  return out;
}

/** Is this exercise well-formed enough to be shown and marked? */
export function validateExercise(ex: ExerciseLike): string | null {
  const payloadSchema = payloadSchemas[ex.kind as keyof typeof payloadSchemas];
  const answerSchema = answerSchemas[ex.kind as keyof typeof answerSchemas];
  if (!payloadSchema || !answerSchema) return `Unknown exercise: ${ex.kind}`;
  if (!payloadSchema.safeParse(ex.payload).success)
    return 'The question is incomplete';
  // `speak` marks itself, so it needs no stored answer.
  if (ex.kind !== 'speak' && !answerSchema.safeParse(ex.answer).success) {
    return 'The answer is missing';
  }
  if (ex.kind === 'complete') {
    const template = (ex.payload as { template: string }).template;
    const answers = ex.answer as unknown[];
    if (gapCount(template) !== answers.length) {
      return 'There is not one answer per gap';
    }
  }
  return null;
}

const sameSet = (a: string[], b: string[]) =>
  a.length === b.length && [...a].sort().join(' ') === [...b].sort().join(' ');

/**
 * Mark an answer.
 *
 * Typed answers go through `answerMatches`, which already forgives case,
 * punctuation and the two Russian letters that look alike — being marked wrong
 * over a missing diaeresis teaches nobody anything.
 */
export function gradeAnswer(ex: ExerciseLike, given: unknown): Grade {
  switch (ex.kind) {
    case 'choice':
      return given === ex.answer ? { correct: true, score: 1 } : WRONG;

    case 'multi': {
      const want = answerSchemas.multi.safeParse(ex.answer);
      const got = answerSchemas.multi.safeParse(given);
      if (!want.success || !got.success) return WRONG;
      const correct = sameSet(want.data, got.data);
      // Partial credit, minus whatever was picked wrongly — otherwise ticking
      // every box scores full marks.
      const hits = got.data.filter((id) => want.data.includes(id)).length;
      const wrong = got.data.length - hits;
      const score = want.data.length
        ? Math.max(0, (hits - wrong) / want.data.length)
        : 0;
      return { correct, score: correct ? 1 : score };
    }

    case 'type':
    case 'listen': {
      const got = typeof given === 'string' ? given : '';
      return matchesAny(got, ex.answer) ? { correct: true, score: 1 } : WRONG;
    }

    case 'complete': {
      const want = answerSchemas.complete.safeParse(ex.answer);
      if (!want.success) return WRONG;
      const answers = Array.isArray(given) ? (given as string[]) : [];
      // Each gap can have its own set of acceptable forms.
      const detail = want.data.map((w, i) => matchesAny(answers[i] ?? '', w));
      const hits = detail.filter(Boolean).length;
      return {
        correct: hits === want.data.length,
        score: want.data.length ? hits / want.data.length : 0,
        detail,
      };
    }

    case 'order': {
      const want = answerSchemas.order.safeParse(ex.answer);
      const got = answerSchemas.order.safeParse(given);
      if (!want.success || !got.success) return WRONG;
      const detail = want.data.map((w, i) => got.data[i] === w);
      const hits = detail.filter(Boolean).length;
      return {
        // Order is all-or-nothing to the learner, but the partial score still
        // tells her how close he was.
        correct:
          hits === want.data.length && got.data.length === want.data.length,
        score: want.data.length ? hits / want.data.length : 0,
        detail,
      };
    }

    case 'match': {
      const want = answerSchemas.match.safeParse(ex.answer);
      const got = answerSchemas.match.safeParse(given);
      if (!want.success) return WRONG;
      const pairs = Object.entries(want.data);
      const answers = got.success ? got.data : {};
      const detail = pairs.map(([k, v]) => answers[k] === v);
      const hits = detail.filter(Boolean).length;
      return {
        correct: hits === pairs.length,
        score: pairs.length ? hits / pairs.length : 0,
        detail,
      };
    }

    case 'speak':
      // Self-marked: nothing in a browser can judge a Russian accent, and
      // pretending otherwise would be worse than trusting him.
      return given === true ? { correct: true, score: 1 } : WRONG;

    default:
      return WRONG;
  }
}
