import { Check, Lock, Sparkles, Star, Trash2, X } from 'lucide-react';
import { Button, Card, IconButton } from '@kernel/ui';
import { cn } from '@kernel/lib';
import { ScavengerProofImage } from './scavenger-proof-image';
import type { ScavengerCardFull } from '../types';

interface Props {
  card: ScavengerCardFull;
  ownerRole: 'a' | 'b' | null;
  /** Display name of the card's creator. */
  ownerName: string;
  /** Display name of the OTHER person — the one who scores this card. */
  raterName: string;
  viewerIsOwner: boolean;
  /** Stars still available to spend on THIS card (pot left + its own stars). */
  maxStars: number;
  onClaim: (c: ScavengerCardFull) => void;
  onUnclaim: (c: ScavengerCardFull) => void;
  onRate: (c: ScavengerCardFull, stars: number) => void;
  onDismiss: (c: ScavengerCardFull) => void;
  onAccept: (c: ScavengerCardFull) => void;
  onDelete: (c: ScavengerCardFull) => void;
}

const TONE = {
  a: { label: 'His', color: '#6f9bd8' },
  b: { label: 'Hers', color: '#d98fb0' },
} as const;

/** Three stars; tappable (with a pot limit) when onPick is given, else static. */
function Stars({
  value,
  onPick,
  limit,
}: {
  value: number;
  onPick?: (n: number) => void;
  limit?: number;
}) {
  return (
    <div className="flex items-center gap-2">
      {[1, 2, 3].map((n) => {
        const overBudget = limit != null && n > limit && n > value;
        return (
          <button
            key={n}
            type="button"
            disabled={!onPick || overBudget}
            onClick={() => onPick?.(n)}
            className={cn(
              onPick && !overBudget ? 'lift-press' : 'cursor-default'
            )}
            aria-label={`${n} star${n > 1 ? 's' : ''}`}
          >
            <Star
              size={onPick ? 30 : 18}
              strokeWidth={1.75}
              className={cn(
                n <= value ? 'fill-gold text-gold' : 'text-muted',
                overBudget && 'opacity-25'
              )}
            />
          </button>
        );
      })}
    </div>
  );
}

export function DateCardItem({
  card,
  ownerRole,
  ownerName,
  raterName,
  viewerIsOwner,
  maxStars,
  onClaim,
  onUnclaim,
  onRate,
  onDismiss,
  onAccept,
  onDelete,
}: Props) {
  const claim = card.scavenger_claims;
  const dismissed = !!claim?.dismissed;
  const accepted = !!claim?.accepted;
  const stars = claim?.stars ?? 0;
  const rated = stars > 0;
  const tone = ownerRole
    ? TONE[ownerRole]
    : { label: 'Deck', color: '#c9a24b' };

  const proof = claim?.image_path ? (
    <ScavengerProofImage
      path={claim.image_path}
      className="aspect-video w-full rounded-lg object-cover"
    />
  ) : null;

  return (
    <Card className="overflow-hidden p-0">
      {/* Deck color seam — blue for his, pink for hers. */}
      <div className="h-1 w-full" style={{ background: tone.color }} />

      <div className="space-y-1.5 p-1.5">
        <div className="flex items-start gap-2.5">
          {/* The physical card photo (or the deck envelope as a fallback). */}
          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-surface-2">
            {card.card_image_path ? (
              <ScavengerProofImage
                path={card.card_image_path}
                className="h-full w-full object-cover"
              />
            ) : (
              <img
                src="/deck.png"
                alt="card"
                className="h-full w-full object-cover opacity-80"
              />
            )}
          </div>
          <div className="min-w-0 flex-1">
            {/* Title carries the deck's colour (no "His/Hers deck" label — the
                tab above already says whose deck this is). */}
            <h3
              className="truncate font-display text-xl font-semibold tracking-tight"
              style={{ color: tone.color }}
            >
              {card.title}
            </h3>
            {card.description && (
              <p className="font-sans text-sm leading-snug text-muted">
                {card.description}
              </p>
            )}
          </div>
          {viewerIsOwner && !accepted && (
            <IconButton label="Delete card" onClick={() => onDelete(card)}>
              <Trash2 className="h-4 w-4" />
            </IconButton>
          )}
        </div>

        {/* ── State machine ──────────────────────────────────────────────
            Owner: private → claim → (waiting | rated → accept). Partner only
            ever sees a claimed, un-cancelled card: score it or cancel review. */}
        {accepted ? (
          // Locked, final — visible to both.
          <div className="space-y-3">
            {proof}
            <div className="flex items-center justify-between">
              <Stars value={stars} />
              <span className="inline-flex items-center gap-1.5 font-sans text-xs font-semibold uppercase tracking-[0.12em] text-success">
                <Lock size={12} /> Accepted
              </span>
            </div>
          </div>
        ) : viewerIsOwner ? (
          !claim ? (
            // Private to me — nobody else can see it until I claim it.
            <div className="space-y-3">
              <p className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1 font-sans text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted">
                <Lock size={11} /> Only you can see this
              </p>
              <Button full onClick={() => onClaim(card)}>
                <Sparkles size={16} /> Claim this date
              </Button>
            </div>
          ) : dismissed ? (
            // Partner sent it back — claim it again to re-reveal.
            <div className="space-y-3">
              <p className="font-sans text-sm text-muted">
                {raterName} sent this back — claim it again when you are ready.
              </p>
              <div className="flex items-center gap-3">
                <Button full onClick={() => onClaim(card)}>
                  <Sparkles size={16} /> Claim again
                </Button>
                <button
                  type="button"
                  onClick={() => onUnclaim(card)}
                  className="shrink-0 px-1 font-sans text-xs uppercase tracking-[0.12em] text-muted lift-press"
                >
                  unclaim
                </button>
              </div>
            </div>
          ) : rated ? (
            // Revealed + scored — accept to lock it in, or pull it back.
            <div className="space-y-3">
              {proof}
              <div className="flex items-center justify-between">
                <Stars value={stars} />
                <button
                  type="button"
                  onClick={() => onUnclaim(card)}
                  className="font-sans text-xs uppercase tracking-[0.12em] text-muted lift-press"
                >
                  unclaim
                </button>
              </div>
              <Button full onClick={() => onAccept(card)}>
                <Check size={16} /> Accept {stars}★ — lock it in
              </Button>
            </div>
          ) : (
            // Revealed — waiting for the partner's stars.
            <div className="space-y-3">
              {proof}
              <div className="flex items-center justify-between gap-3">
                <p className="font-sans text-sm text-muted">
                  Revealed to {raterName} · waiting for their stars…
                </p>
                <button
                  type="button"
                  onClick={() => onUnclaim(card)}
                  className="shrink-0 font-sans text-xs uppercase tracking-[0.12em] text-muted lift-press"
                >
                  unclaim
                </button>
              </div>
            </div>
          )
        ) : (
          // Partner view — only reached when claimed & not cancelled.
          <div className="space-y-3">
            {proof}
            {rated ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Stars
                    value={stars}
                    limit={maxStars}
                    onPick={(n) => onRate(card, n)}
                  />
                  <button
                    type="button"
                    onClick={() => onDismiss(card)}
                    className="inline-flex items-center gap-1 font-sans text-xs uppercase tracking-[0.12em] text-muted lift-press"
                  >
                    <X size={12} /> cancel
                  </button>
                </div>
                <p className="font-sans text-xs text-muted">
                  Tap a star to adjust · waiting for {ownerName} to accept
                </p>
              </div>
            ) : (
              <div className="space-y-2 text-center">
                <p className="eyebrow justify-center">
                  {ownerName} claimed this — how good was it?
                </p>
                <div className="flex justify-center">
                  <Stars
                    value={0}
                    limit={maxStars}
                    onPick={(n) => onRate(card, n)}
                  />
                </div>
                {maxStars < 3 && (
                  <p className="font-sans text-xs text-muted">
                    {maxStars === 0
                      ? 'Pot empty — no stars left to give'
                      : `${maxStars} left in the pot`}
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => onDismiss(card)}
                  className="inline-flex items-center gap-1 font-sans text-xs uppercase tracking-[0.12em] text-muted lift-press"
                >
                  <X size={12} /> cancel review
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
