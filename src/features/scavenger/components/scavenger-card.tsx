import { Camera, Trash2 } from 'lucide-react';
import { useMembers } from '@kernel/auth';
import { Badge, Button, Card, IconButton } from '@kernel/ui';
import { ScavengerProofImage } from './scavenger-proof-image';
import type { ScavengerCardFull } from '../types';

interface Props {
  card: ScavengerCardFull;
  onClaim: (card: ScavengerCardFull) => void;
  onArgue: (card: ScavengerCardFull) => void;
  onUnclaim: (card: ScavengerCardFull) => void;
  onDelete: (card: ScavengerCardFull) => void;
}

export function ScavengerCardItem({
  card,
  onClaim,
  onArgue,
  onUnclaim,
  onDelete,
}: Props) {
  const { data: members } = useMembers();
  const claim = card.scavenger_claims;
  const nameFor = (id: string | null) =>
    members?.find((m) => m.user_id === id)?.display_name ?? '—';

  return (
    <Card className="space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-semibold">{card.title}</h3>
          {card.description && (
            <p className="text-sm text-muted">{card.description}</p>
          )}
        </div>
        <Badge tone="accent">{card.points} pt</Badge>
      </div>

      {claim ? (
        <div className="space-y-2">
          <ScavengerProofImage
            path={claim.image_path ?? ''}
            className="aspect-video w-full rounded object-cover"
          />
          <div className="flex items-center justify-between">
            <Badge tone="success">
              Claimed 🎉 · {nameFor(claim.claimed_by)}
            </Badge>
            <button
              type="button"
              onClick={() => onUnclaim(card)}
              className="text-xs text-muted"
            >
              undo
            </button>
          </div>
          {claim.note && <p className="text-sm">{claim.note}</p>}
        </div>
      ) : (
        <div className="space-y-2">
          <Button full onClick={() => onClaim(card)}>
            <Camera size={16} /> Claim it
          </Button>
          {card.scavenger_arguments.length > 0 && (
            <div className="space-y-1 rounded bg-surface-2 p-2">
              {card.scavenger_arguments.map((a) => (
                <p key={a.user_id} className="text-xs text-muted">
                  <b>{nameFor(a.user_id)}:</b> {a.body}
                </p>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={() => onArgue(card)}
            className="text-xs text-accent"
          >
            Why we didn't… ›
          </button>
        </div>
      )}

      <div className="flex justify-end">
        <IconButton label="Delete card" onClick={() => onDelete(card)}>
          <Trash2 className="h-4 w-4" />
        </IconButton>
      </div>
    </Card>
  );
}
