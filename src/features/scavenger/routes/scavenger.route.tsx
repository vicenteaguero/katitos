import { useState } from 'react';
import { Crown, Plus, Sparkles } from 'lucide-react';
import { useMembers, usePartner, useUserId } from '@kernel/auth';
import { useTableSync } from '@kernel/realtime';
import { qk } from '@kernel/query';
import {
  Button,
  CameraCapture,
  Card,
  Empty,
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
  useClaimCard,
  useDeleteScavengerCard,
  useDismissClaim,
  useRateDate,
  useUnclaimCard,
} from '../api/scavenger.mutations';
import { DateCardItem } from '../components/scavenger-card';
import { ClaimReveal } from '../components/claim-reveal';
import { ScavengerProofImage } from '../components/scavenger-proof-image';
import { STAR_POT, type ScavengerCardFull } from '../types';
import '../scavenger.css';

type Role = 'a' | 'b';

const TONE: Record<Role, string> = { a: '#6f9bd8', b: '#d98fb0' };

interface Reveal {
  title: string;
  tone: string;
  photoUrl: string | null;
  cardImagePath: string | null;
}

export function ScavengerRoute({
  georgia = true,
}: {
  /** Visually scopes the deck to the Georgia trip (shows the eyebrow). */
  georgia?: boolean;
} = {}) {
  useTableSync('scavenger_cards', qk.scavenger.cards());
  useTableSync('scavenger_claims', qk.scavenger.cards());
  const userId = useUserId();
  const { self } = usePartner();
  const { data: members } = useMembers();
  const { data: cards, isLoading } = useScavengerCards();
  const addCard = useAddDateCard();
  const claim = useClaimCard();
  const rate = useRateDate();
  const dismiss = useDismissClaim();
  const accept = useAcceptRating();
  const unclaim = useUnclaimCard();
  const del = useDeleteScavengerCard();

  const myRole: Role = self?.role === 'b' ? 'b' : 'a';
  const [deck, setDeck] = useState<Role>(myRole);
  const [adding, setAdding] = useState(false);
  const [cardCam, setCardCam] = useState(false);
  const [cardBlob, setCardBlob] = useState<Blob | null>(null);
  const [form, setForm] = useState({ title: '', description: '' });
  const [claiming, setClaiming] = useState<ScavengerCardFull | null>(null);
  const [claimCam, setClaimCam] = useState(false);
  const [claimBlob, setClaimBlob] = useState<Blob | null>(null);
  const [reveal, setReveal] = useState<Reveal | null>(null);

  const roleOf = (uid: string | null): Role | null =>
    (members?.find((m) => m.user_id === uid)?.role as Role | undefined) ?? null;
  const nameOf = (role: Role): string =>
    members?.find((m) => m.role === role)?.display_name ??
    (role === 'a' ? 'Katito' : 'Katita');
  const partnerName = nameOf(myRole === 'a' ? 'b' : 'a');
  const toneOf = (c: ScavengerCardFull) => TONE[roleOf(c.created_by) ?? 'a'];

  // Visibility — claim to reveal: I see ALL my own cards in any state; my
  // partner's cards are hidden until they claim one (and not cancel it), or it
  // is accepted. A brand-new, unclaimed card is invisible to the partner.
  const visible = (cards ?? []).filter((c) => {
    if (c.created_by === userId) return true;
    const cl = c.scavenger_claims;
    return !!cl && (!cl.dismissed || cl.accepted);
  });

  // Scores: stars on a person's OWN deck (awarded by the other). The shared pot
  // is whatever's been given across both decks; nobody can score themselves.
  const starsOf = (c: ScavengerCardFull) => c.scavenger_claims?.stars ?? 0;
  const scoreFor = (role: Role) =>
    visible.reduce(
      (s, c) => s + (roleOf(c.created_by) === role ? starsOf(c) : 0),
      0
    );
  const scoreA = scoreFor('a');
  const scoreB = scoreFor('b');
  const used = scoreA + scoreB;
  const potLeft = Math.max(0, STAR_POT - used);

  const deckCards = visible.filter((c) => roleOf(c.created_by) === deck);
  const topDates = [...visible]
    .filter((c) => starsOf(c) > 0)
    .sort((a, b) => starsOf(b) - starsOf(a))
    .slice(0, 5);

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

  const openClaim = (card: ScavengerCardFull) => {
    setClaimBlob(null);
    setClaiming(card);
  };

  // Fire the reveal immediately (the BOOM is the whole point) and persist the
  // claim in the background. By the time the reveal dismisses, the list's
  // refreshed and the card shows its revealed state.
  const confirmClaim = () => {
    const card = claiming;
    if (!card || !userId) return;
    const blob = claimBlob;
    setReveal({
      title: card.title,
      tone: toneOf(card),
      photoUrl: blob ? URL.createObjectURL(blob) : null,
      cardImagePath: card.card_image_path,
    });
    setClaiming(null);
    setClaimBlob(null);
    claim.mutate(
      { cardId: card.id, claimedBy: userId, blob },
      { onError: (e) => toast.error(e.message) }
    );
  };

  const submitCard = () => {
    if (!form.title.trim()) return;
    addCard.mutate(
      {
        title: form.title.trim(),
        description: form.description || null,
        position: visible.filter((c) => roleOf(c.created_by) === myRole).length,
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
      <div>
        {georgia && <p className="eyebrow mb-3">Georgia trip</p>}
        <PageHeader
          title="Date cards"
          subtitle="Claim a date to reveal it · they award the stars 🌟"
          action={
            <Button size="sm" onClick={() => setAdding(true)}>
              <Plus size={16} /> Add
            </Button>
          }
        />
      </div>

      {/* The leaderboard — two decks drawing from one shared pot of stars. */}
      <Card className="space-y-4">
        <div className="flex items-stretch text-center">
          {(['a', 'b'] as Role[]).map((role, i) => {
            const score = role === 'a' ? scoreA : scoreB;
            const leads = score > (role === 'a' ? scoreB : scoreA);
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
                  style={{ color: TONE[role] }}
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
          title={
            deck === myRole
              ? 'No date cards yet'
              : `Nothing from ${nameOf(deck)} yet`
          }
          hint={
            deck === myRole
              ? 'Tap Add — your cards stay secret until you claim them.'
              : `${nameOf(deck)}'s cards stay hidden until they claim one.`
          }
        />
      ) : (
        <div className="curtain-stagger space-y-3">
          {deckCards.map((c) => (
            <DateCardItem
              key={c.id}
              card={c}
              ownerRole={roleOf(c.created_by)}
              ownerName={nameOf(roleOf(c.created_by) ?? 'a')}
              raterName={nameOf(roleOf(c.created_by) === 'a' ? 'b' : 'a')}
              viewerIsOwner={c.created_by === userId}
              maxStars={potLeft + starsOf(c)}
              onClaim={openClaim}
              onUnclaim={(card) => unclaim.mutate(card.id)}
              onRate={onRate}
              onDismiss={(card) => dismiss.mutate(card.id)}
              onAccept={(card) =>
                accept.mutate(card.id, {
                  onSuccess: () => toast.success('Locked in 🔒'),
                  onError: (e) => toast.error(e.message),
                })
              }
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

      {/* Add-card photo + claim proof both reuse the in-app camera. */}
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
      {claimCam && (
        <CameraCapture
          facingMode="environment"
          onCapture={(blob) => {
            setClaimBlob(blob);
            setClaimCam(false);
          }}
          onCancel={() => setClaimCam(false)}
        />
      )}

      <Sheet
        open={adding}
        onClose={() => setAdding(false)}
        title="New date card"
      >
        <div className="space-y-4">
          <p className="font-sans text-sm text-muted">
            Only you can see this until you claim it. 🤫
          </p>
          <Field label="Title">
            <Input
              value={form.title}
              onChange={(e) =>
                setForm((f) => ({ ...f, title: e.target.value }))
              }
              placeholder="Picnic at Turtle Lake"
            />
          </Field>
          <Field label="What it says" hint="The note written on the card">
            <Textarea
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              rows={2}
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
          <Button
            full
            onClick={submitCard}
            disabled={addCard.isPending || !form.title.trim()}
          >
            Add to my deck
          </Button>
        </div>
      </Sheet>

      <Sheet
        open={!!claiming}
        onClose={() => {
          setClaiming(null);
          setClaimBlob(null);
        }}
        title={claiming ? `Claim "${claiming.title}"` : 'Claim'}
        size="half"
      >
        <div className="space-y-4">
          <p className="font-sans text-sm text-muted">
            Claiming reveals this date to {partnerName} so they can give it
            stars. Add a proof photo if you like.
          </p>
          <button
            type="button"
            onClick={() => setClaimCam(true)}
            className="lift-press flex h-24 w-full items-center justify-center overflow-hidden rounded-lg bg-surface-2 font-sans text-sm text-muted"
          >
            {claimBlob ? (
              <img
                src={URL.createObjectURL(claimBlob)}
                alt="proof"
                className="h-full w-full object-cover"
              />
            ) : (
              'Add a proof photo (optional)'
            )}
          </button>
          <Button full onClick={confirmClaim} disabled={claim.isPending}>
            <Sparkles size={16} /> Claim it
          </Button>
        </div>
      </Sheet>

      {reveal && (
        <ClaimReveal
          title={reveal.title}
          toneColor={reveal.tone}
          photoUrl={reveal.photoUrl}
          cardImagePath={reveal.cardImagePath}
          onDone={() => {
            if (reveal.photoUrl) URL.revokeObjectURL(reveal.photoUrl);
            setReveal(null);
          }}
        />
      )}
    </div>
  );
}
