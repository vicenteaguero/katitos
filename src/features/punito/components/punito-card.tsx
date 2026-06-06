import { Pencil, Trash2 } from 'lucide-react';
import { Badge, Button, Card, IconButton } from '@kernel/ui';
import type { Punito } from '../types';

const statusTone = {
  proposed: 'neutral',
  sealed: 'success',
  broken: 'danger',
} as const;

export function PunitoCard({
  punito,
  onSeal,
  onBreak,
  onEdit,
  onDelete,
}: {
  punito: Punito;
  onSeal: (p: Punito) => void;
  onBreak: (p: Punito) => void;
  onEdit: (p: Punito) => void;
  onDelete: (p: Punito) => void;
}) {
  const tone =
    statusTone[punito.status as keyof typeof statusTone] ?? 'neutral';

  return (
    <Card className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xl">🤙</span>
            <h3 className="truncate font-semibold">{punito.title}</h3>
          </div>
          {punito.description && (
            <p className="mt-1 text-sm text-muted">{punito.description}</p>
          )}
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Badge tone={punito.level === 'serious' ? 'accent' : 'neutral'}>
              {punito.level}
            </Badge>
            <Badge tone={tone}>{punito.status}</Badge>
          </div>
        </div>
        <div className="flex shrink-0 gap-1">
          <IconButton label="Edit" onClick={() => onEdit(punito)}>
            <Pencil className="h-4 w-4" />
          </IconButton>
          <IconButton label="Delete" onClick={() => onDelete(punito)}>
            <Trash2 className="h-4 w-4" />
          </IconButton>
        </div>
      </div>

      {punito.status === 'proposed' && (
        <Button full onClick={() => onSeal(punito)}>
          Seal it 🤙
        </Button>
      )}
      {punito.status === 'sealed' && (
        <Button full variant="ghost" onClick={() => onBreak(punito)}>
          Broken
        </Button>
      )}
    </Card>
  );
}
