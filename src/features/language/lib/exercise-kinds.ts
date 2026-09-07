import type { ExerciseKind } from '../types';

/** What a question is called on its card, in the learner's words. */
export const EXERCISE_KIND_LABEL: Record<ExerciseKind, string> = {
  choice: 'Choose one',
  multi: 'Choose several',
  type: 'Type it',
  complete: 'Fill the gaps',
  order: 'Put in order',
  match: 'Match',
  listen: 'Listen',
  speak: 'Say it',
};

/**
 * The label for one question, reading the two shapes of Choose that are
 * their own thing off the payload.
 */
export function exerciseKindLabel(ex: {
  kind: string;
  payload?: unknown;
}): string {
  const variant = (ex.payload as { variant?: string } | null)?.variant;
  if (variant === 'stress') return "Where's the stress?";
  if (variant === 'pair') return 'Which did you hear?';
  return EXERCISE_KIND_LABEL[ex.kind as ExerciseKind] ?? 'Question';
}
