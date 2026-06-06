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
    <Card className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-lg font-semibold">{name.name}</h3>
            <Badge tone={genderTone[gender]}>{genderLabel[gender]}</Badge>
          </div>
          {name.meaning && (
            <p className="mt-1 text-sm text-fg">{name.meaning}</p>
          )}
          {name.origin && (
            <p className="text-xs text-muted">Origin: {name.origin}</p>
          )}
          {name.notes && (
            <p className="mt-1 truncate text-xs text-muted">{name.notes}</p>
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
        <div className="flex flex-wrap gap-x-2 gap-y-1 text-xs text-muted">
          {votes.map((v) => (
            <span key={v.user_id}>
              {memberName(v)} {voteEmoji(v.vote)}
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => castVote(1)}
          disabled={vote.isPending}
          className={cn(
            'flex h-10 flex-1 items-center justify-center gap-2 rounded font-medium transition disabled:opacity-50',
            myVote === 1
              ? 'bg-success text-white'
              : 'bg-surface-2 text-fg active:bg-border'
          )}
        >
          <span aria-hidden>💚</span> Like
        </button>
        <button
          type="button"
          onClick={() => castVote(-1)}
          disabled={vote.isPending}
          className={cn(
            'flex h-10 flex-1 items-center justify-center gap-2 rounded font-medium transition disabled:opacity-50',
            myVote === -1
              ? 'bg-danger text-white'
              : 'bg-surface-2 text-fg active:bg-border'
          )}
        >
          <span aria-hidden>✖️</span> Pass
        </button>
      </div>
    </Card>
  );
}
