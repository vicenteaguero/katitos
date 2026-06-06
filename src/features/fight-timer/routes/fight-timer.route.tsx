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
    <div>
      <PageHeader title="Fights" subtitle="We always make up 💛" />

      {isLoading ? (
        <LoadingScreen />
      ) : (
        <div className="space-y-6">
          {active.data ? (
            <ActiveFight fight={active.data} />
          ) : (
            <Card className="text-center">
              <CardTitle>No fight right now</CardTitle>
              <p className="mt-1 text-sm text-muted">All good between us 💛</p>
              <Button
                full
                variant="danger"
                className="mt-4"
                onClick={() => setStarting(true)}
              >
                Start a fight 😤
              </Button>
            </Card>
          )}

          <section>
            <h2 className="mb-2 text-sm font-semibold text-muted">History</h2>
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
