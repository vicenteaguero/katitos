import { useState } from 'react';
import { qk } from '@kernel/query';
import { useTableSync } from '@kernel/realtime';
import {
  Button,
  Card,
  CardTitle,
  Empty,
  Field,
  Input,
  LoadingScreen,
  PageHeader,
  Sheet,
  toast,
} from '@kernel/ui';
import { useActiveFight, useFightHistory } from '../api/fights.queries';
import { useStartFight } from '../api/fights.mutations';
import { ActiveFight } from '../components/active-fight';
import { FightHistory } from '../components/fight-history';

export function FightTimerRoute() {
  useTableSync('fights', qk.fights.all());
  const active = useActiveFight();
  const history = useFightHistory();
  const start = useStartFight();

  const [starting, setStarting] = useState(false);
  const [reason, setReason] = useState('');

  const handleStart = () => {
    if (!reason.trim()) {
      toast.error('What are we fighting about?');
      return;
    }
    start.mutate(reason.trim(), {
      onSuccess: () => {
        setStarting(false);
        setReason('');
      },
      onError: (e) => toast.error(e.message),
    });
  };

  const isLoading = active.isLoading || history.isLoading;

  return (
    <div className="curtain-reveal space-y-12">
      {/* A hushed footlight rising behind the title — the house dimmed, the
          quarrel held tenderly in candle-warmth, never under harsh light. */}
      <div className="relative isolate">
        <div
          className="footlight candle-flicker pointer-events-none absolute inset-x-0 -top-6 -bottom-10 -z-10"
          aria-hidden="true"
        />
        <PageHeader title="Fights" subtitle="We always make up ❤️" />
      </div>

      {isLoading ? (
        <LoadingScreen />
      ) : (
        <div className="space-y-12">
          <section className="space-y-7">
            <p className="eyebrow">On Stage Now</p>
            {active.data ? (
              <ActiveFight fight={active.data} />
            ) : (
              <Card className="space-y-6 text-center">
                <CardTitle>No fight right now</CardTitle>
                <p className="font-sans text-sm leading-relaxed text-muted">
                  All good between us ❤️
                </p>
                <Button
                  full
                  variant="secondary"
                  onClick={() => setStarting(true)}
                >
                  Start a fight 😤
                </Button>
              </Card>
            )}
          </section>

          {/* Her wine flowing into his olive — every quarrel resolves on this
              single gold-stitched line of reconciliation. */}
          <hr className="seam" aria-hidden="true" />

          <section className="space-y-7">
            <p className="eyebrow">The Reconciliations</p>
            {!history.data || history.data.length === 0 ? (
              <Empty
                icon="🤝"
                title="No fights yet"
                hint="When you make up, it'll show up here."
              />
            ) : (
              <FightHistory fights={history.data} />
            )}
          </section>
        </div>
      )}

      <Sheet
        open={starting}
        onClose={() => setStarting(false)}
        title="Start a fight 😤"
      >
        <div className="space-y-3">
          <Field label="What's it about?">
            <Input
              autoFocus
              placeholder="Who left the dishes…"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleStart();
              }}
            />
          </Field>
          <Button full onClick={handleStart} disabled={start.isPending}>
            Start the clock
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
