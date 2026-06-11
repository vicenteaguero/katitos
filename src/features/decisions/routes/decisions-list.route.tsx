import { useEffect, useState, type CSSProperties } from 'react';
import { Plus } from 'lucide-react';
import { useUserId } from '@kernel/auth';
import { qk } from '@kernel/query';
import { useTableSync } from '@kernel/realtime';
import {
  Button,
  Empty,
  Fab,
  Field,
  Input,
  LoadingScreen,
  PageHeader,
  Sheet,
  Textarea,
  toast,
} from '@kernel/ui';
import { useDecisions } from '../api/decisions.queries';
import {
  useAgree,
  useDeleteDecision,
  useReopen,
  useSetPosition,
} from '../api/decisions.mutations';
import { DecisionCard } from '../components/decision-card';
import { DecisionForm } from '../components/decision-form';
import type { DecisionWithPositions } from '../types';

export function DecisionsListRoute() {
  useTableSync('decisions', qk.decisions.list());
  useTableSync('decision_positions', qk.decisions.list());

  const userId = useUserId();
  const { data, isLoading, isError } = useDecisions();
  const del = useDeleteDecision();
  const reopen = useReopen();
  const setPosition = useSetPosition();
  const agree = useAgree();

  const [creating, setCreating] = useState(false);
  const [positionFor, setPositionFor] = useState<DecisionWithPositions | null>(
    null
  );
  const [agreeFor, setAgreeFor] = useState<DecisionWithPositions | null>(null);

  const [position, setPositionValue] = useState('');
  const [note, setNote] = useState('');
  const [agreedValue, setAgreedValue] = useState('');

  // Seed the "my position" sheet from this user's existing position.
  useEffect(() => {
    if (!positionFor) return;
    const mine = positionFor.decision_positions.find(
      (p) => p.user_id === userId
    );
    setPositionValue(mine?.position ?? '');
    setNote(mine?.note ?? '');
  }, [positionFor, userId]);

  useEffect(() => {
    if (!agreeFor) return;
    setAgreedValue(agreeFor.agreed_value ?? '');
  }, [agreeFor]);

  const handleDelete = (d: DecisionWithPositions) => {
    if (confirm(`Delete "${d.topic}"?`)) {
      del.mutate(d.id, {
        onSuccess: () => toast.success('Deleted'),
        onError: (e) => toast.error(e.message),
      });
    }
  };

  const handleReopen = (d: DecisionWithPositions) => {
    reopen.mutate(d.id, {
      onSuccess: () => toast.success('Reopened'),
      onError: (e) => toast.error(e.message),
    });
  };

  const submitPosition = () => {
    if (!positionFor || !position.trim()) return;
    setPosition.mutate(
      {
        decisionId: positionFor.id,
        position: position.trim(),
        note: note.trim() || null,
      },
      {
        onSuccess: () => {
          toast.success('Position saved');
          setPositionFor(null);
        },
        onError: (e) => toast.error(e.message),
      }
    );
  };

  const submitAgree = () => {
    if (!agreeFor || !agreedValue.trim()) return;
    agree.mutate(
      { id: agreeFor.id, agreed_value: agreedValue.trim() },
      {
        onSuccess: () => {
          toast.success('Agreed 🎉');
          setAgreeFor(null);
        },
        onError: (e) => toast.error(e.message),
      }
    );
  };

  return (
    <div className="curtain-reveal space-y-12">
      <PageHeader
        title="Decisions"
        subtitle="Big stuff we settle together ⚖️"
      />

      <section className="space-y-7">
        <p className="eyebrow">The Verdict</p>

        {isLoading ? (
          <LoadingScreen />
        ) : isError ? (
          <Empty
            icon="⚠️"
            title="Couldn't load"
            hint="Try again in a moment."
          />
        ) : !data || data.length === 0 ? (
          <Empty
            icon="⚖️"
            title="No decisions yet"
            hint="Tap + to log something to agree on."
          />
        ) : (
          <div className="curtain-stagger space-y-7">
            {data.map((d, i) => (
              <div key={d.id} style={{ '--i': i } as CSSProperties}>
                <DecisionCard
                  decision={d}
                  onSetPosition={setPositionFor}
                  onAgree={setAgreeFor}
                  onReopen={handleReopen}
                  onDelete={handleDelete}
                />
              </div>
            ))}
          </div>
        )}
      </section>

      <Fab label="Add decision" onClick={() => setCreating(true)}>
        <Plus />
      </Fab>

      <Sheet
        open={creating}
        onClose={() => setCreating(false)}
        title="New decision"
      >
        <DecisionForm onDone={() => setCreating(false)} />
      </Sheet>

      <Sheet
        open={positionFor !== null}
        onClose={() => setPositionFor(null)}
        title={
          positionFor ? `My position: ${positionFor.topic}` : 'My position'
        }
      >
        <div className="space-y-5">
          <p className="eyebrow">Cast Your Vote</p>
          <Field label="Position">
            <Input
              placeholder="e.g. 15"
              value={position}
              onChange={(e) => setPositionValue(e.target.value)}
            />
          </Field>
          <Field label="Note">
            <Textarea
              placeholder="optional reasoning"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </Field>
          <Button
            full
            onClick={submitPosition}
            disabled={!position.trim() || setPosition.isPending}
          >
            Save position
          </Button>
        </div>
      </Sheet>

      <Sheet
        open={agreeFor !== null}
        onClose={() => setAgreeFor(null)}
        title={agreeFor ? `Agree: ${agreeFor.topic}` : 'Agree'}
      >
        <div className="space-y-5">
          <p className="eyebrow">The Final Word</p>
          <Field label="Agreed value">
            <Input
              placeholder="The number we both accept"
              value={agreedValue}
              onChange={(e) => setAgreedValue(e.target.value)}
            />
          </Field>
          <Button
            full
            onClick={submitAgree}
            disabled={!agreedValue.trim() || agree.isPending}
          >
            Mark agreed
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
