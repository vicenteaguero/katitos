import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useUserId } from '@kernel/auth';
import { useTableSync } from '@kernel/realtime';
import { qk } from '@kernel/query';
import {
  Button,
  CameraCapture,
  Card,
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
import { useScavengerCards } from '../api/scavenger.queries';
import {
  useAddArgument,
  useAddScavengerCard,
  useClaimCard,
  useDeleteScavengerCard,
  useUnclaimCard,
} from '../api/scavenger.mutations';
import { ScavengerCardItem } from '../components/scavenger-card';
import type { ScavengerCardFull } from '../types';

export function ScavengerRoute() {
  useTableSync('scavenger_cards', qk.scavenger.cards());
  useTableSync('scavenger_claims', qk.scavenger.cards());
  useTableSync('scavenger_arguments', qk.scavenger.cards());
  const userId = useUserId();
  const { data: cards, isLoading } = useScavengerCards();
  const claim = useClaimCard();
  const unclaim = useUnclaimCard();
  const addCard = useAddScavengerCard();
  const addArg = useAddArgument();
  const del = useDeleteScavengerCard();

  const [claiming, setClaiming] = useState<ScavengerCardFull | null>(null);
  const [arguing, setArguing] = useState<ScavengerCardFull | null>(null);
  const [argText, setArgText] = useState('');
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', points: '1' });

  const list = cards ?? [];
  const claimed = list.filter((c) => c.scavenger_claims != null);
  const points = claimed.reduce((s, c) => s + (c.points ?? 0), 0);

  const onCapture = (blob: Blob) => {
    const card = claiming;
    setClaiming(null);
    if (card)
      claim.mutate(
        { cardId: card.id, blob },
        {
          onSuccess: () => toast.success('Claimed! 🎉'),
          onError: (e) => toast.error(e.message),
        }
      );
  };

  const submitArg = () => {
    if (arguing && argText.trim())
      addArg.mutate(
        { cardId: arguing.id, body: argText.trim() },
        {
          onSuccess: () => {
            setArguing(null);
            setArgText('');
            toast.success('Saved');
          },
        }
      );
  };

  const submitCard = () => {
    if (!form.title.trim()) return;
    addCard.mutate(
      {
        title: form.title.trim(),
        description: form.description || null,
        points: Number(form.points) || 1,
        position: list.length,
      },
      {
        onSuccess: () => {
          setAdding(false);
          setForm({ title: '', description: '', points: '1' });
        },
      }
    );
  };

  return (
    <div className="curtain-reveal space-y-8">
      <div className="relative">
        {/* A single candle glow behind the quest's title — the treasure map lit. */}
        <div
          className="footlight pointer-events-none absolute inset-x-0 -top-8 bottom-0"
          aria-hidden="true"
        />
        <div className="relative">
          <PageHeader
            title="Date cards"
            subtitle="Claim them in secret in Georgia 🇬🇪"
          />

          <Card className="flex justify-around text-center shadow-candle">
            <div className="space-y-1">
              <p className="gilt-text font-display text-4xl font-semibold tabular-nums">
                {claimed.length}/{list.length}
              </p>
              <p className="eyebrow">Claimed</p>
            </div>
            <div
              className="mx-2 w-px self-stretch bg-border/40"
              aria-hidden="true"
            />
            <div className="space-y-1">
              <p className="gilt-text font-display text-4xl font-semibold tabular-nums">
                {points}
              </p>
              <p className="eyebrow">Points</p>
            </div>
          </Card>
        </div>
      </div>

      {/* The relationship as one gold-stitched line before the quest unfurls. */}
      <hr className="seam" aria-hidden="true" />

      <section className="space-y-7">
        <p className="eyebrow">The Quest</p>
        {isLoading ? (
          <LoadingScreen />
        ) : list.length === 0 ? (
          <Empty
            icon="✉"
            title="No date cards yet"
            hint="Tap + to seal your first clue."
          />
        ) : (
          <div className="curtain-stagger space-y-3">
            {list.map((c) => (
              <ScavengerCardItem
                key={c.id}
                card={c}
                onClaim={setClaiming}
                onArgue={(card) => {
                  setArguing(card);
                  setArgText(
                    card.scavenger_arguments.find((a) => a.user_id === userId)
                      ?.body ?? ''
                  );
                }}
                onUnclaim={(card) => unclaim.mutate(card.id)}
                onDelete={(card) => {
                  if (confirm(`Delete "${card.title}"?`)) del.mutate(card.id);
                }}
              />
            ))}
          </div>
        )}
      </section>

      <Fab label="Add card" onClick={() => setAdding(true)}>
        <Plus />
      </Fab>

      {claiming && (
        <CameraCapture
          facingMode="environment"
          onCapture={onCapture}
          onCancel={() => setClaiming(null)}
        />
      )}

      <Sheet
        open={!!arguing}
        onClose={() => setArguing(null)}
        title="Why we didn't do it"
      >
        <div className="space-y-3">
          <Textarea
            value={argText}
            onChange={(e) => setArgText(e.target.value)}
            placeholder="our excuse…"
          />
          <Button full onClick={submitArg}>
            Save
          </Button>
        </div>
      </Sheet>

      <Sheet
        open={adding}
        onClose={() => setAdding(false)}
        title="Seal a new clue"
      >
        <div className="space-y-3">
          <Field label="Title">
            <Input
              value={form.title}
              onChange={(e) =>
                setForm((f) => ({ ...f, title: e.target.value }))
              }
            />
          </Field>
          <Field label="Description">
            <Textarea
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
            />
          </Field>
          <Field label="Points">
            <Input
              type="number"
              value={form.points}
              onChange={(e) =>
                setForm((f) => ({ ...f, points: e.target.value }))
              }
            />
          </Field>
          <Button full onClick={submitCard}>
            Add card
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
