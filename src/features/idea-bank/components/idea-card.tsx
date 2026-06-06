import { Pencil, Trash2 } from 'lucide-react';
import { Badge, Card, IconButton, toast } from '@kernel/ui';
import { useUpdateIdea } from '../api/ideas.mutations';
import type { Idea } from '../types';

type Status = 'idea' | 'planned' | 'done';

const NEXT_STATUS: Record<Status, Status> = {
  idea: 'planned',
  planned: 'done',
  done: 'idea',
};

const STATUS_TONE: Record<Status, 'neutral' | 'warning' | 'success'> = {
  idea: 'neutral',
  planned: 'warning',
  done: 'success',
};

const STATUS_LABEL: Record<Status, string> = {
  idea: 'Idea',
  planned: 'Planned',
  done: 'Done',
};

const asStatus = (s: string): Status =>
  s === 'planned' || s === 'done' ? s : 'idea';

export function IdeaCard({
  idea,
  onEdit,
  onDelete,
}: {
  idea: Idea;
  onEdit: (i: Idea) => void;
  onDelete: (i: Idea) => void;
}) {
  const update = useUpdateIdea();
  const status = asStatus(idea.status);

  const cycleStatus = () => {
    update.mutate(
      { id: idea.id, status: NEXT_STATUS[status] },
      { onError: (e) => toast.error(e.message) }
    );
  };

  return (
    <Card className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xl">💡</span>
          <h3 className="truncate font-semibold">{idea.title}</h3>
        </div>
        {idea.description && (
          <p className="mt-1 text-sm text-muted">{idea.description}</p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {idea.category && <Badge tone="accent">{idea.category}</Badge>}
          <button
            type="button"
            onClick={cycleStatus}
            disabled={update.isPending}
            aria-label="Cycle status"
          >
            <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>
          </button>
        </div>
      </div>
      <div className="flex shrink-0 gap-1">
        <IconButton label="Edit" onClick={() => onEdit(idea)}>
          <Pencil className="h-4 w-4" />
        </IconButton>
        <IconButton label="Delete" onClick={() => onDelete(idea)}>
          <Trash2 className="h-4 w-4" />
        </IconButton>
      </div>
    </Card>
  );
}
