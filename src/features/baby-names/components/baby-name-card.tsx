import { Trash2 } from 'lucide-react';
import { useUserId, useMembers } from '@kernel/auth';
import { Badge, Card, IconButton, toast } from '@kernel/ui';
import { cn } from '@kernel/lib';
import { useVoteName, useDeleteBabyName } from '../api/baby-names.mutations';
import type { BabyNameVote, BabyNameWithVotes, Gender } from '../types';

const genderTone: Record<Gender, 'accent' | 'success' | 'neutral'> = {
  girl: 'accent',
  boy: 'success',
  any: 'neutral',
};

const genderLabel: Record<Gender, string> = {
  girl: 'Girl',
  boy: 'Boy',
  any: 'Any',
};

function voteEmoji(vote: number): string {
  return vote > 0 ? '💚' : '✖️';
}

export function BabyNameCard({ name }: { name: BabyNameWithVotes }) {
  const userId = useUserId();
  const { data: members } = useMembers();
  const vote = useVoteName();
  const del = useDeleteBabyName();

  const votes = name.baby_name_votes;
  const myVote = votes.find((v) => v.user_id === userId)?.vote ?? null;
  const gender = (name.gender ?? 'any') as Gender;

  const castVote = (value: 1 | -1) => {
    vote.mutate(
      { nameId: name.id, vote: value },
      { onError: (e) => toast.error(e.message) }
    );
  };

  const handleDelete = () => {
    if (confirm(`Delete "${name.name}"?`)) {
      del.mutate(name.id, {
        onSuccess: () => toast.success('Deleted'),
        onError: (e) => toast.error(e.message),
      });
    }
  };

  const memberName = (v: BabyNameVote): string =>
    members?.find((m) => m.user_id === v.user_id)?.display_name ?? 'Someone';

  return (
    <Card className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        {/* The dreamed name on a lit ivory stage — Cormorant, like an engraved nameplate. */}
        <div className="marble gilt-hairline-flat min-w-0 flex-1 px-5 py-4">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2">
            <h3 className="truncate font-display text-3xl font-semibold leading-tight tracking-tight text-accent">
              {name.name}
            </h3>
            <Badge tone={genderTone[gender]}>{genderLabel[gender]}</Badge>
          </div>
          {name.meaning && (
            <p className="mt-2 font-display text-base font-light italic leading-snug text-brown">
              {name.meaning}
            </p>
          )}
          {name.origin && (
            <p className="mt-1 font-sans text-xs font-medium uppercase tracking-[0.12em] text-brown/70">
              Origin · {name.origin}
            </p>
          )}
          {name.notes && (
            <p className="mt-2 truncate font-sans text-xs text-brown/80">
              {name.notes}
            </p>
          )}
        </div>
        <IconButton
          label="Delete"
          className="shrink-0"
          onClick={handleDelete}
          disabled={del.isPending}
        >
          <Trash2 className="h-4 w-4" />
        </IconButton>
      </div>

      {votes.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-sans text-xs text-muted">
          {votes.map((v) => (
            <span key={v.user_id} className="inline-flex items-center gap-1">
              <span className="text-purple">{memberName(v)}</span>
              <span aria-hidden>{voteEmoji(v.vote)}</span>
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => castVote(1)}
          disabled={vote.isPending}
          className={cn(
            'lift-press flex h-12 flex-1 items-center justify-center gap-2 rounded-none font-sans text-sm font-semibold tracking-[0.02em] transition disabled:opacity-50',
            myVote === 1
              ? 'bg-success gilt-hairline-flat text-accent-fg shadow-catch'
              : 'velvet-2 gilt-hairline-flat text-fg hover:brightness-110'
          )}
        >
          <span aria-hidden>💚</span> Like
        </button>
        <button
          type="button"
          onClick={() => castVote(-1)}
          disabled={vote.isPending}
          className={cn(
            'lift-press flex h-12 flex-1 items-center justify-center gap-2 rounded-none font-sans text-sm font-semibold tracking-[0.02em] transition disabled:opacity-50',
            myVote === -1
              ? 'bg-danger gilt-hairline-flat text-accent-fg shadow-catch'
              : 'velvet-2 gilt-hairline-flat text-fg hover:brightness-110'
          )}
        >
          <span aria-hidden>✖️</span> Pass
        </button>
      </div>
    </Card>
  );
}
