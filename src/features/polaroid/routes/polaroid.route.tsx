import { useEffect, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router';
import { useDrag } from '@use-gesture/react';
import { Camera, Check } from 'lucide-react';
import { DateTime } from 'luxon';
import { qk } from '@kernel/query';
import { useTableSync } from '@kernel/realtime';
import {
  Button,
  Card,
  Empty,
  Input,
  LoadingScreen,
  PageHeader,
  toast,
} from '@kernel/ui';
import { PolaroidCamera } from '../components/polaroid-camera';
import { usePolaroids, useTodayPolaroid } from '../api/polaroid.queries';
import {
  useSetPolaroidCaption,
  useUpsertPolaroid,
} from '../api/polaroid.mutations';
import { PolaroidImage } from '../components/polaroid-image';
import { todayKey } from '../types';

function TodayCard({ onOpenCamera }: { onOpenCamera: () => void }) {
  const { data: today, isLoading } = useTodayPolaroid();
  const setCaption = useSetPolaroidCaption();
  const day = todayKey();

  if (isLoading) return <LoadingScreen />;

  if (!today) {
    return (
      <Card className="footlight flex flex-col items-center gap-6 py-9 text-center">
        <span
          className="polaroid-warmth pointer-events-none absolute inset-0 -z-10"
          aria-hidden="true"
          style={{
            background:
              'radial-gradient(60% 50% at 50% 40%, rgb(181 99 58 / 0.16), transparent 70%)',
          }}
        />
        <span className="gilt-text candle-flicker text-5xl" aria-hidden="true">
          <Camera className="mx-auto h-12 w-12" strokeWidth={1.25} />
        </span>
        <div className="space-y-2">
          <p className="font-display text-2xl font-medium tracking-tight text-fg">
            No portrait developed yet
          </p>
          <p className="font-sans text-sm leading-relaxed text-muted">
            One instant photo a day — taken in the moment, hung on our wall.
          </p>
        </div>
        <Button onClick={onOpenCamera}>
          <Camera size={18} /> Take today's photo
        </Button>
      </Card>
    );
  }

  return (
    <Card className="footlight space-y-7">
      {/* A copper candle-pool warming the portrait from within the loge. */}
      <span
        className="polaroid-warmth pointer-events-none absolute inset-0 -z-10"
        aria-hidden="true"
        style={{
          background:
            'radial-gradient(58% 48% at 50% 42%, rgb(181 99 58 / 0.16), transparent 70%)',
        }}
      />

      {/* The instant photo on its marble plate — gilt-framed, floating in light. */}
      <figure className="m-0">
        <div className="marble gilt-hairline shadow-loge p-3 pb-4">
          <PolaroidImage
            path={today.image_path}
            full
            className="aspect-square w-full"
          />
        </div>
      </figure>

      <div className="space-y-3">
        <Input
          defaultValue={today.caption ?? ''}
          placeholder="Add a caption…"
          className="border-0 bg-transparent px-0 py-1 text-center font-display text-xl italic text-fg shadow-none placeholder:italic placeholder:text-muted focus:shadow-none"
          onBlur={(e) => {
            if (e.target.value !== (today.caption ?? '')) {
              setCaption.mutate({ day, caption: e.target.value });
            }
          }}
        />
      </div>

      <Button variant="secondary" full onClick={onOpenCamera}>
        <Camera size={18} /> Retake
      </Button>
    </Card>
  );
}

function Gallery() {
  const { data, isLoading } = usePolaroids();
  if (isLoading) return null;
  const past = (data ?? []).filter((p) => p.day !== todayKey());
  if (past.length === 0) {
    return (
      <Empty
        icon="📸"
        title="Your album starts today"
        hint="Past days collect here."
      />
    );
  }
  // A vertical film-roll: each past day is a full-width polaroid card — square
  // photo on cream stock inside a rounded frame. No grid, no borders.
  return (
    <div className="curtain-stagger space-y-8">
      {past.map((p, i) => (
        <figure
          key={p.id}
          className="marble m-0 w-full rounded-lg p-3 pb-5 shadow-loge"
          style={{ '--i': i } as React.CSSProperties}
        >
          <PolaroidImage
            path={p.image_path}
            className="aspect-square w-full rounded-none"
          />
          <figcaption className="mt-4 px-1 text-center">
            <span className="block font-sans text-[0.6875rem] font-semibold uppercase tracking-[0.22em] text-copper">
              {DateTime.fromISO(p.day).toFormat('LLL d')}
            </span>
            {p.caption && (
              <span className="mt-1 block font-display text-lg italic leading-snug text-brown">
                {p.caption}
              </span>
            )}
          </figcaption>
        </figure>
      ))}
    </div>
  );
}

/**
 * Replace-stack: today's photo and the new shot held like two physical
 * polaroids — drag the front one aside (it tilts away in 3D) to reveal the
 * other behind, swipe to toggle which is on top. "Keep this" commits whichever
 * is front. The old photo is never deleted (versioned storage paths).
 */
function ReplaceStack({
  oldPath,
  newUrl,
  onConfirm,
  onCancel,
  saving,
}: {
  oldPath: string;
  newUrl: string;
  /** which: 'new' saves the new shot, 'old' keeps the current one. */
  onConfirm: (which: 'new' | 'old') => void;
  onCancel: () => void;
  saving: boolean;
}) {
  // front === 'new' → the fresh shot is on top.
  const [front, setFront] = useState<'new' | 'old'>('new');
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);

  const bind = useDrag(({ active, movement: [mx], last }) => {
    setDragging(active);
    if (last) {
      if (Math.abs(mx) > 80) setFront((f) => (f === 'new' ? 'old' : 'new'));
      setDx(0);
      return;
    }
    setDx(active ? mx : 0);
  });

  const StackCard = ({
    isFront,
    children,
    label,
  }: {
    isFront: boolean;
    children: ReactNode;
    label: string;
  }) => (
    <div
      className={`absolute inset-0${
        isFront && dragging ? '' : ' transition-transform duration-300'
      }`}
      style={{
        transform: isFront
          ? `translateX(${dx}px) rotateY(${dx / -18}deg)`
          : 'translateX(14px) translateY(14px) scale(0.94) rotateY(8deg)',
        transformOrigin: 'center',
        zIndex: isFront ? 2 : 1,
        opacity: isFront ? 1 : 0.85,
        touchAction: 'pan-y',
      }}
      {...(isFront ? bind() : {})}
    >
      <div className="marble gilt-hairline shadow-loge h-full p-3 pb-9">
        <div className="aspect-square w-full overflow-hidden bg-brown">
          {children}
        </div>
        <span className="mt-2 block text-center font-sans text-[0.625rem] font-semibold uppercase tracking-[0.18em] text-brown/70">
          {label}
        </span>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-black/90 p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <p className="mt-2 text-center font-display text-2xl italic text-fg">
        Keep which one?
      </p>
      <p className="mt-1 text-center font-sans text-xs text-muted">
        Swipe to flip between them
      </p>
      <div
        className="relative mx-auto mt-8 w-full max-w-[20rem] flex-1"
        style={{ perspective: '1200px' }}
      >
        {/* Render back card first, front second (front handles the drag). */}
        <StackCard isFront={front === 'old'} label="On the wall">
          <PolaroidImage path={oldPath} full className="h-full w-full" />
        </StackCard>
        <StackCard isFront={front === 'new'} label="New shot">
          <img
            src={newUrl}
            alt="New shot"
            className="h-full w-full object-cover"
          />
        </StackCard>
      </div>
      <div className="mt-8 flex items-center justify-center gap-4">
        <Button variant="secondary" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={() => onConfirm(front)} disabled={saving}>
          <Check size={18} />{' '}
          {saving ? 'Saving…' : front === 'new' ? 'Use new' : 'Keep current'}
        </Button>
      </div>
    </div>
  );
}

export function PolaroidRoute() {
  useTableSync('polaroids', qk.polaroids.all());
  const upsert = useUpsertPolaroid();
  const { data: today } = useTodayPolaroid();
  const [camOpen, setCamOpen] = useState(false);
  const [pending, setPending] = useState<{ blob: Blob; url: string } | null>(
    null
  );
  const [params, setParams] = useSearchParams();
  const day = todayKey();

  // The middle nav button deep-links here with ?shoot=1 → jump straight into
  // the camera instead of landing on the page first.
  useEffect(() => {
    if (params.get('shoot') === '1') {
      setCamOpen(true);
      params.delete('shoot');
      setParams(params, { replace: true });
    }
  }, [params, setParams]);

  const save = (blob: Blob) =>
    upsert.mutate(
      { day, blob },
      {
        onSuccess: () => toast.success('Polaroid saved 📸'),
        onError: (e) => toast.error(e.message),
      }
    );

  const onCapture = (blob: Blob) => {
    setCamOpen(false);
    // Already have today's photo → compare before replacing (never auto-saves).
    if (today) setPending({ blob, url: URL.createObjectURL(blob) });
    else save(blob);
  };

  const closePending = () => {
    if (pending) URL.revokeObjectURL(pending.url);
    setPending(null);
  };

  const confirmReplace = (which: 'new' | 'old') => {
    if (!pending) return;
    if (which === 'old') {
      closePending();
      return;
    }
    upsert.mutate(
      { day, blob: pending.blob },
      {
        onSuccess: () => {
          toast.success('Polaroid replaced 📸');
          closePending();
        },
        onError: (e) => toast.error(e.message),
      }
    );
  };

  return (
    <div className="curtain-reveal space-y-8">
      <PageHeader
        title="Polaroid"
        subtitle="One photo a day, taken in the moment"
      />

      <TodayCard onOpenCamera={() => setCamOpen(true)} />

      <section className="space-y-5">
        <h2 className="eyebrow">Our album</h2>
        <Gallery />
      </section>

      {camOpen && (
        <PolaroidCamera
          facingMode="user"
          onCapture={onCapture}
          onCancel={() => setCamOpen(false)}
        />
      )}

      {pending && today && (
        <ReplaceStack
          oldPath={today.image_path}
          newUrl={pending.url}
          onConfirm={confirmReplace}
          onCancel={closePending}
          saving={upsert.isPending}
        />
      )}
    </div>
  );
}
