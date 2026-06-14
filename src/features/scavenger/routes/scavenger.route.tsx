import { useState } from 'react';
import { Crown, Plus } from 'lucide-react';
import { useMembers, usePartner, useUserId } from '@kernel/auth';
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
  Segmented,
  Sheet,
  Textarea,
  toast,
} from '@kernel/ui';
import { useScavengerCards } from '../api/scavenger.queries';
import {
  useAcceptRating,
  useAddDateCard,
  useDeleteScavengerCard,
  useMarkDateDone,
  useRateDate,
  useUnclaimCard,
} from '../api/scavenger.mutations';
import { DateCardItem } from '../components/scavenger-card';
import { ScavengerProofImage } from '../components/scavenger-proof-image';
import { STAR_POT, type ScavengerCardFull } from '../types';

type Role = 'a' | 'b';

export function ScavengerRoute() {
  useTableSync('scavenger_cards', qk.scavenger.cards());
  useTableSync('scavenger_claims', qk.scavenger.cards());
  const userId = useUserId();
  const { self } = usePartner();
  const { data: members } = useMembers();
  const { data: cards, isLoading } = useScavengerCards();
  const addCard = useAddDateCard();
  const markDone = useMarkDateDone();
  const rate = useRateDate();
  const accept = useAcceptRating();
  const unclaim = useUnclaimCard();
  const del = useDeleteScavengerCard();

  const myRole: Role = self?.role === 'b' ? 'b' : 'a';
  const [deck, setDeck] = useState<Role>(myRole);
  const [doing, setDoing] = useState<ScavengerCardFull | null>(null);
  const [adding, setAdding] = useState(false);
  const [cardCam, setCardCam] = useState(false);
  const [cardBlob, setCardBlob] = useState<Blob | null>(null);
  const [form, setForm] = useState({ title: '', description: '' });

  const list = cards ?? [];
  const roleOf = (uid: string | null): Role | null =>
    (members?.find((m) => m.user_id === uid)?.role as Role | undefined) ?? null;
  const nameOf = (role: Role): string =>
    members?.find((m) => m.role === role)?.display_name ??
    (role === 'a' ? 'Katito' : 'Katita');

  // Scores: stars on a person's OWN deck (awarded by the other). The shared pot
  // is whatever's been given across both decks; nobody can score themselves.
  const starsOf = (c: ScavengerCardFull) => c.scavenger_claims?.stars ?? 0;
  const scoreFor = (role: Role) =>
    list.reduce(
      (s, c) => s + (roleOf(c.created_by) === role ? starsOf(c) : 0),
      0
    );
  const scoreA = scoreFor('a');
  const scoreB = scoreFor('b');
  const used = scoreA + scoreB;
  const potLeft = Math.max(0, STAR_POT - used);

  const deckCards = list.filter((c) => roleOf(c.created_by) === deck);
  const topDates = [...list]
    .filter((c) => starsOf(c) > 0)
    .sort((a, b) => starsOf(b) - starsOf(a))
    .slice(0, 5);

  const onDoneCapture = (blob: Blob) => {
    const card = doing;
    setDoing(null);
    if (card)
      markDone.mutate(
        { cardId: card.id, blob },
        {
          onSuccess: () => toast.success('Date logged 📸'),
          onError: (e) => toast.error(e.message),
        }
      );
  };

  const onRate = (card: ScavengerCardFull, stars: number) => {
    if (!userId) return;
    const maxForCard = potLeft + starsOf(card);
    if (stars > maxForCard) {
      toast.info(
        `Only ${maxForCard} star${maxForCard === 1 ? '' : 's'} left in the pot 🌟`
      );
      return;
    }
    rate.mutate(
      { cardId: card.id, stars, ratedBy: userId },
      { onError: (e) => toast.error(e.message) }
    );
  };

  const submitCard = () => {
    if (!form.title.trim()) return;
    addCard.mutate(
      {
        title: form.title.trim(),
        description: form.description || null,
        position: list.filter((c) => roleOf(c.created_by) === myRole).length,
        cardBlob,
      },
      {
        onSuccess: () => {
          setAdding(false);
          setForm({ title: '', description: '' });
          setCardBlob(null);
          setDeck(myRole);
        },
        onError: (e) => toast.error(e.message),
      }
    );
  };

  if (isLoading) return <LoadingScreen />;

  return (
    <div className="curtain-reveal space-y-7">
      <PageHeader
        title="Date cards"
        subtitle="Secret dates in Georgia · score each other, not yourself 🌟"
      />

      {/* The leaderboard — two decks drawing from one shared pot of stars. */}
      <Card className="space-y-4">
        <div className="flex items-stretch text-center">
          {(['a', 'b'] as Role[]).map((role, i) => {
            const score = role === 'a' ? scoreA : scoreB;
            const leads = score > (role === 'a' ? scoreB : scoreA);
            const color = role === 'a' ? '#6f9bd8' : '#d98fb0';
            return (
              <div
                key={role}
                className={
                  i === 0
                    ? 'flex-1 space-y-1 border-r border-border/30'
                    : 'flex-1 space-y-1'
                }
              >
                <p
                  className="inline-flex items-center gap-1 font-sans text-xs font-semibold uppercase tracking-[0.16em]"
                  style={{ color }}
                >
                  {leads && <Crown size={12} className="text-gold" />}
                  {nameOf(role)}
                </p>
                <p className="gilt-text font-display text-5xl font-semibold tabular-nums">
                  {score}
                </p>
                <p className="font-sans text-[0.6rem] uppercase tracking-[0.18em] text-muted">
                  stars
                </p>
              </div>
            );
          })}
        </div>
        {/* Pot meter. */}
        <div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#6f9bd8] to-[#d98fb0] transition-[width]"
              style={{ width: `${(used / STAR_POT) * 100}%` }}
            />
          </div>
          <p className="mt-1.5 text-center font-sans text-[0.7rem] uppercase tracking-[0.16em] text-muted">
            {used} / {STAR_POT} stars given · {potLeft} left in the pot
          </p>
        </div>
      </Card>

      <Segmented
        value={deck}
        onChange={setDeck}
        className="w-full"
        options={[
          { value: 'a', label: `${nameOf('a')} 💙` },
          { value: 'b', label: `${nameOf('b')} 💗` },
        ]}
      />

      {deckCards.length === 0 ? (
        <Empty
          icon="✉"
          title={`No cards in ${nameOf(deck)}'s deck yet`}
          hint={
            deck === myRole
              ? 'Tap + to add your date cards — title, note, and a photo of the card.'
              : `${nameOf(deck)} hasn't added cards yet.`
          }
        />
      ) : (
        <div className="curtain-stagger space-y-3">
          {deckCards.map((c) => (
            <DateCardItem
              key={c.id}
              card={c}
              ownerRole={roleOf(c.created_by)}
              raterName={nameOf(roleOf(c.created_by) === 'a' ? 'b' : 'a')}
              viewerIsOwner={c.created_by === userId}
              maxStars={potLeft + starsOf(c)}
              onMarkDone={setDoing}
              onRate={onRate}
              onAccept={(card) =>
                accept.mutate(card.id, {
                  onSuccess: () => toast.success('Locked in 🔒'),
                  onError: (e) => toast.error(e.message),
                })
              }
              onUndo={(card) => unclaim.mutate(card.id)}
              onDelete={(card) => {
                if (confirm(`Delete "${card.title}"?`)) del.mutate(card.id);
              }}
            />
          ))}
        </div>
      )}

      {topDates.length > 0 && (
        <section className="space-y-3">
          <p className="eyebrow">Top dates</p>
          <div className="space-y-2">
            {topDates.map((c, i) => (
              <div key={c.id} className="flex items-center gap-3">
                <span className="w-4 shrink-0 text-center font-display text-lg font-semibold text-gold">
                  {i + 1}
                </span>
                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-surface-2">
                  {c.scavenger_claims?.image_path ? (
                    <ScavengerProofImage
                      path={c.scavenger_claims.image_path}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <img
                      src="/deck.png"
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
                <p className="min-w-0 flex-1 truncate font-display text-base text-fg">
                  {c.title}
                  <span className="ml-1.5 font-sans text-xs text-muted">
                    · {nameOf(roleOf(c.created_by) ?? 'a')}
                  </span>
                </p>
                <span className="shrink-0 font-display text-lg font-semibold tabular-nums text-gold">
                  {starsOf(c)}★
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <Fab label="Add card" onClick={() => setAdding(true)}>
        <Plus />
      </Fab>

      {doing && (
        <CameraCapture
          facingMode="environment"
          onCapture={onDoneCapture}
          onCancel={() => setDoing(null)}
        />
      )}
      {cardCam && (
        <CameraCapture
          facingMode="environment"
          onCapture={(blob) => {
            setCardBlob(blob);
            setCardCam(false);
          }}
          onCancel={() => setCardCam(false)}
        />
      )}

      <Sheet
        open={adding}
        onClose={() => setAdding(false)}
        title={`Add to ${nameOf(myRole)}'s deck`}
      >
        <div className="space-y-3">
          <Field label="Title">
            <Input
              value={form.title}
              onChange={(e) =>
                setForm((f) => ({ ...f, title: e.target.value }))
              }
              placeholder="Picnic at Turtle Lake"
            />
          </Field>
          <Field label="What it says">
            <Textarea
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              rows={2}
              placeholder="the text on the card…"
            />
          </Field>
          <Field label="Photo of the card">
            <button
              type="button"
              onClick={() => setCardCam(true)}
              className="lift-press flex h-20 w-full items-center justify-center overflow-hidden rounded-lg bg-surface-2 font-sans text-sm text-muted"
            >
              {cardBlob ? (
                <img
                  src={URL.createObjectURL(cardBlob)}
                  alt="card"
                  className="h-full w-full object-cover"
                />
              ) : (
                'Tap to photograph the card'
              )}
            </button>
          </Field>
          <Button full onClick={submitCard} disabled={addCard.isPending}>
            Add card
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
