import { Copy, Pencil } from 'lucide-react';
import {
  DragHandle,
  ROW_TOOL,
  RowToolbar,
  type DragHandleProps,
} from '@kernel/ui';
import { BlockCard } from '../kit';
import { answerText } from '../../lib/answer-text';
import { exerciseKindLabel } from '../../lib/exercise-kinds';
import { pick } from '../../lib/pick';
import type { Exercise, Lang } from '../../types';

/**
 * One question in the builder: what kind, what it asks, what the answer is,
 * in one line each. Tap it to edit; the tools show under a mouse.
 */
export function QuestionCard({
  exercise: ex,
  support,
  target,
  handle,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  exercise: Exercise;
  support: Lang;
  target: Lang;
  handle?: DragHandleProps;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const payload = ex.payload as { options?: unknown[] } | null;
  const summary = [
    payload?.options?.length ? `${payload.options.length} options` : null,
    ex.kind === 'speak' ? 'he records himself' : null,
    answerText(ex, target) ? `answer: ${answerText(ex, target)}` : null,
  ]
    .filter(Boolean)
    .join(', ');
  const meta = [exerciseKindLabel(ex).toLowerCase(), `${ex.points} pts`].join(
    ', '
  );
  return (
    <BlockCard
      kind={`Question, ${meta}`}
      tone="question"
      className="md:ml-7"
      toolbar={
        <RowToolbar onDelete={onDelete} deleteLabel="Delete question" reveal>
          <button
            type="button"
            aria-label="Edit question"
            onClick={onEdit}
            className={ROW_TOOL}
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            aria-label="Duplicate question"
            onClick={onDuplicate}
            className={ROW_TOOL}
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
          {handle && <DragHandle {...handle} />}
        </RowToolbar>
      }
    >
      <button
        type="button"
        onClick={onEdit}
        className="block w-full rounded text-left outline-none focus-visible:ring-2 focus-visible:ring-gold"
      >
        <span className="block font-sans text-sm font-semibold text-fg">
          {pick(ex, 'prompt', support) || 'Untitled question'}
        </span>
        {summary && (
          <span className="block truncate font-sans text-xs font-medium text-muted">
            {summary}
          </span>
        )}
      </button>
    </BlockCard>
  );
}
