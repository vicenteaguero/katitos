import { Camera, Trash2 } from 'lucide-react';
import { useMembers } from '@kernel/auth';
import { Badge, Button, Card, IconButton } from '@kernel/ui';
import { cn } from '@kernel/lib';
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

  const sealed = !claim;

  return (
    <Card
      className={cn(
        'space-y-4',
        // Sealed clues lean imperial lapis; opened ones rest in the dark loge.
        sealed && 'bg-lapis'
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <p className="eyebrow !mx-0 justify-start text-left">
            {sealed ? 'Sealed clue' : 'Claimed'}
          </p>
          <h3 className="font-display text-2xl font-semibold tracking-tight text-fg">
            {card.title}
          </h3>
          {card.description && (
            <p className="font-sans text-sm leading-relaxed text-muted">
              {card.description}
            </p>
          )}
        </div>
        <Badge tone={sealed ? 'neutral' : 'success'}>{card.points} pt</Badge>
      </div>

      {claim ? (
        <div className="space-y-3">
          <ScavengerProofImage
            path={claim.image_path ?? ''}
            className="gilt-hairline aspect-video w-full rounded-none object-cover shadow-loge"
          />
          <div className="flex items-center justify-between">
            <Badge tone="success">
              {nameFor(claim.claimed_by)} · claimed it
            </Badge>
            <button
              type="button"
              onClick={() => onUnclaim(card)}
              className="font-sans text-xs uppercase tracking-[0.12em] text-muted lift-press"
            >
              undo
            </button>
          </div>
          {claim.note && (
            <p className="font-display text-lg italic leading-snug text-fg">
              “{claim.note}”
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <Button full onClick={() => onClaim(card)}>
            <Camera size={16} /> Claim it
          </Button>
          {card.scavenger_arguments.length > 0 && (
            <div className="gilt-hairline-flat space-y-1.5 bg-surface/60 p-3">
              {card.scavenger_arguments.map((a) => (
                <p key={a.user_id} className="font-sans text-xs text-muted">
                  <b className="text-fg">{nameFor(a.user_id)}:</b> {a.body}
                </p>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={() => onArgue(card)}
            className="font-sans text-xs uppercase tracking-[0.12em] text-purple lift-press"
          >
            Why we didn't… ›
          </button>
        </div>
      )}

      <div
        className="draw-rule -mx-1 border-t border-border/30 pt-2"
        aria-hidden="true"
      />
      <div className="flex justify-end">
        <IconButton label="Delete card" onClick={() => onDelete(card)}>
          <Trash2 className="h-4 w-4" />
        </IconButton>
      </div>
    </Card>
  );
}
