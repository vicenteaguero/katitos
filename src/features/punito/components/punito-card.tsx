import { Pencil, Trash2 } from 'lucide-react';
import { Badge, Button, Card, IconButton } from '@kernel/ui';
import type { Punito } from '../types';

const statusTone = {
  proposed: 'neutral',
  sealed: 'success',
  broken: 'danger',
} as const;

// The little wax seal that crowns each promise — gilt when sealed, dim otherwise.
const sealGlyph = {
  proposed: '🤙',
  sealed: '🤙',
  broken: '💔',
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
  const isSealed = punito.status === 'sealed';
  const isBroken = punito.status === 'broken';
  const glyph = sealGlyph[punito.status as keyof typeof sealGlyph] ?? '🤙';

  return (
    <Card className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            {/* The gilt wax seal — shimmers gold once a promise is sealed. */}
            <span
              className={
                isSealed
                  ? 'gilt-text gold-shimmer text-2xl leading-none'
                  : isBroken
                    ? 'text-2xl leading-none opacity-70'
                    : 'gilt-text candle-flicker text-2xl leading-none'
              }
              aria-hidden="true"
            >
              {glyph}
            </span>
            <h3 className="truncate font-display text-2xl font-semibold tracking-tight text-fg">
              {punito.title}
            </h3>
          </div>
          {punito.description && (
            <p className="mt-2 font-sans text-sm leading-relaxed text-muted">
              {punito.description}
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
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
          Mark broken
        </Button>
      )}
    </Card>
  );
}
