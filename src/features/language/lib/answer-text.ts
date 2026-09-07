import { acceptedForms, type ExerciseOption } from './exercise-schema';
import type { Lang } from '../types';

type Ex = {
  kind: string;
  answer: unknown;
  payload: unknown;
};

/**
 * The right answer, said plainly: for "show him" in class, for "wanted:"
 * when she marks, for the one-line summary of a question in the builder.
 *
 * `target` is the language the option is in; an option is looked up in it
 * first and then in whatever it has.
 */
export function answerText(ex: Ex, target: Lang = 'ru'): string {
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
        .join(', ');
    }
    case 'match':
      return (payload?.pairs ?? [])
        .map((p) => `${p.left} = ${p.right}`)
        .join(', ');
    case 'order': {
      const a = ex.answer as unknown;
      const first = Array.isArray(a) && Array.isArray(a[0]) ? a[0] : a;
      return Array.isArray(first) ? (first as string[]).join(' ') : '';
    }
    case 'complete':
      return ((ex.answer as unknown[]) ?? [])
        .map((gap) => acceptedForms(gap).join(' / '))
        .join(', ');
    case 'speak':
      return '';
    default:
      return acceptedForms(ex.answer).join(' / ');
  }
}
