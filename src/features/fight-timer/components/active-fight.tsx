import { useState } from 'react';
import { useNow } from '@kernel/hooks';
import { DateTime } from '@kernel/lib';
import { Button, Card, Textarea, toast } from '@kernel/ui';
import { useEndFight } from '../api/fights.mutations';
import type { Fight } from '../types';

/** Live "Xh Ym Zs" elapsed since `startedAt`, ticking against `now`. */
function elapsedLabel(startedAt: string, now: DateTime): string {
  const dur = now
    .diff(DateTime.fromISO(startedAt))
    .shiftTo('hours', 'minutes', 'seconds');
  const hours = Math.max(0, Math.floor(dur.hours));
  const minutes = Math.max(0, Math.floor(dur.minutes));
  const seconds = Math.max(0, Math.floor(dur.seconds));
  return `${hours}h ${String(minutes).padStart(2, '0')}m ${String(
    seconds
  ).padStart(2, '0')}s`;
}

export function ActiveFight({ fight }: { fight: Fight }) {
  const now = useNow(1000);
  const end = useEndFight();
  const [ending, setEnding] = useState(false);
  const [resolution, setResolution] = useState('');

  const handleEnd = () => {
    end.mutate(
      { id: fight.id, resolution: resolution.trim() || undefined },
      {
        onSuccess: () => {
          toast.success('Made up 💛');
          setEnding(false);
          setResolution('');
        },
        onError: (e) => toast.error(e.message),
      }
    );
  };

  return (
    <Card className="border-danger/40 bg-danger/5">
      <p className="text-xs font-medium uppercase tracking-wide text-danger">
        Fighting since {DateTime.fromISO(fight.started_at).toFormat('t')}
      </p>
      <p className="mt-2 text-4xl font-bold tabular-nums text-danger">
        {elapsedLabel(fight.started_at, now)}
      </p>
      {fight.reason && (
        <p className="mt-3 text-sm text-fg">
          <span className="text-muted">About: </span>
          {fight.reason}
        </p>
      )}

      {ending ? (
        <div className="mt-4 space-y-2">
          <Textarea
            autoFocus
            placeholder="How did we make up? (optional)"
            value={resolution}
            onChange={(e) => setResolution(e.target.value)}
          />
          <div className="flex gap-2">
            <Button full onClick={handleEnd} disabled={end.isPending}>
              We made up 💛
            </Button>
            <Button
              variant="ghost"
              onClick={() => setEnding(false)}
              disabled={end.isPending}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button
          full
          variant="danger"
          className="mt-4"
          onClick={() => setEnding(true)}
        >
          End fight
        </Button>
      )}
    </Card>
  );
}
