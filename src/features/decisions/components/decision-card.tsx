import { Check, MessageSquare, RotateCcw, Trash2 } from 'lucide-react';
import { useMembers } from '@kernel/auth';
import { Badge, Button, Card, IconButton } from '@kernel/ui';
import type { DecisionWithPositions } from '../types';

export function DecisionCard({
  decision,
  onSetPosition,
  onAgree,
  onReopen,
  onDelete,
}: {
  decision: DecisionWithPositions;
  onSetPosition: (d: DecisionWithPositions) => void;
  onAgree: (d: DecisionWithPositions) => void;
  onReopen: (d: DecisionWithPositions) => void;
  onDelete: (d: DecisionWithPositions) => void;
}) {
  const { data: members } = useMembers();
  const isAgreed = decision.status === 'agreed';

  return (
    <Card className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-semibold">{decision.topic}</h3>
            <Badge tone={isAgreed ? 'success' : 'neutral'}>
              {isAgreed ? 'Agreed' : 'Open'}
            </Badge>
          </div>
          {decision.description && (
            <p className="mt-1 text-sm text-muted">{decision.description}</p>
          )}
        </div>
        <div className="flex shrink-0 gap-1">
          <IconButton label="Delete" onClick={() => onDelete(decision)}>
            <Trash2 className="h-4 w-4" />
          </IconButton>
        </div>
      </div>

      {isAgreed && (
        <div className="rounded bg-success/15 px-3 py-2 text-success">
          <span className="text-xs font-medium uppercase tracking-wide">
            Agreed on
          </span>
          <p className="text-lg font-semibold">
            {decision.agreed_value ?? '—'}
          </p>
        </div>
      )}

      <ul className="space-y-1 text-sm">
        {(members ?? []).map((m) => {
          const pos = decision.decision_positions.find(
            (p) => p.user_id === m.user_id
          );
          return (
            <li key={m.user_id} className="flex items-baseline gap-2">
              <span className="text-muted">
                {m.emoji ? `${m.emoji} ` : ''}
                {m.display_name}:
              </span>
              <span className="font-medium">{pos?.position ?? '—'}</span>
              {pos?.note && (
                <span className="truncate text-xs text-muted">
                  — {pos.note}
                </span>
              )}
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => onSetPosition(decision)}
        >
          <MessageSquare className="h-4 w-4" />
          My position
        </Button>
        {isAgreed ? (
          <Button size="sm" variant="ghost" onClick={() => onReopen(decision)}>
            <RotateCcw className="h-4 w-4" />
            Reopen
          </Button>
        ) : (
          <Button size="sm" onClick={() => onAgree(decision)}>
            <Check className="h-4 w-4" />
            Agree
          </Button>
        )}
      </div>
    </Card>
  );
}
