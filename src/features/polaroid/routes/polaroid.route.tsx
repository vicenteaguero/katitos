import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
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
import { PolaroidViewer } from '../components/polaroid-viewer';
import { usePolaroids, useTodayPolaroid } from '../api/polaroid.queries';
import {
  useSetPolaroidCaption,
  useUpsertPolaroid,
} from '../api/polaroid.mutations';
import { PolaroidImage } from '../components/polaroid-image';
import { todayKey, type Polaroid } from '../types';

function TodayCard({
  onOpenCamera,
  onOpen,
}: {
  onOpenCamera: () => void;
  onOpen: () => void;
}) {
  const { data: today, isLoading } = useTodayPolaroid();
  const setCaption = useSetPolaroidCaption();
  const day = todayKey();

  if (isLoading) return <LoadingScreen />;

  if (!today) {
    // Just the button — no card, no decorative chrome, no dead top space.
    return (
      <div className="flex justify-center py-2">
        <Button onClick={onOpenCamera}>
          <Camera size={18} /> Take today's photo
        </Button>
      </div>
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

      {/* The instant photo on its marble plate — gilt-framed, floating in light.
          Tap to lift it off the wall into the full-screen viewer. */}
      <figure className="m-0">
        <button
          type="button"
          onClick={onOpen}
          aria-label="View full screen"
          className="marble gilt-hairline shadow-loge lift-press block w-full p-3 pb-4"
        >
          <PolaroidImage
            path={today.image_path}
            full
            className="aspect-square w-full"
          />
        </button>
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

function Gallery({ onOpen }: { onOpen: (day: string) => void }) {
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

  // A vertical film-roll grouped into months — each new month opens a fresh
  // reel, so a long album is easy to scrub by chapter. Order is preserved
  // (newest-first); within a reel, full-width polaroids on cream stock. Tap one
  // to lift it into the full-screen viewer. No grid, no borders.
  const months: { key: string; label: string; items: Polaroid[] }[] = [];
  for (const p of past) {
    const key = p.day.slice(0, 7);
    const reel = months[months.length - 1];
    if (reel && reel.key === key) reel.items.push(p);
    else
      months.push({
        key,
        label: DateTime.fromISO(p.day).toFormat('LLLL yyyy'),
        items: [p],
      });
  }

  return (
    <div className="space-y-7">
      {months.map((m) => (
        <section key={m.key} className="space-y-5">
          <h3 className="text-center font-sans text-[0.625rem] font-semibold uppercase tracking-[0.3em] text-copper/80">
            {m.label}
          </h3>
          <div className="curtain-stagger space-y-6">
            {m.items.map((p, i) => (
              <figure
                key={p.id}
                className="m-0"
                style={{ '--i': i } as React.CSSProperties}
              >
                <button
                  type="button"
                  onClick={() => onOpen(p.day)}
                  aria-label={`View ${DateTime.fromISO(p.day).toFormat('LLL d')}`}
                  className="marble lift-press block w-full rounded-lg p-3 pb-5 shadow-loge"
                >
                  <PolaroidImage
                    path={p.image_path}
                    className="aspect-square w-full"
                  />
                  <figcaption className="mt-4 px-1 text-center">
                    <span className="block font-sans text-[0.6875rem] font-semibold uppercase tracking-[0.22em] text-copper">
                      {DateTime.fromISO(p.day).toFormat('ccc, LLL d')}
                    </span>
                    {p.caption && (
                      <span className="mt-1 block font-display text-lg italic leading-snug text-brown">
                        {p.caption}
                      </span>
                    )}
                  </figcaption>
                </button>
              </figure>
            ))}
          </div>
        </section>
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

  // Lock the page behind the immersive overlay while choosing.
  useEffect(() => {
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = prev;
    };
  }, []);

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

  // Portaled to <body>: the route root's `.curtain-reveal` transform would
  // otherwise be the containing block for this `fixed` overlay, stretching it
  // over the full (multi-screen) page and making it scroll. The portal restores
  // true viewport fixing; the column then locks to exactly one screen.
  return createPortal(
    <div className="fixed inset-0 z-[80] flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden bg-black/90 px-6 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))]">
      <div className="shrink-0 text-center">
        <p className="font-display text-2xl italic text-fg">Keep which one?</p>
        <p className="mt-1 font-sans text-xs text-muted">
          Swipe to flip between them
        </p>
      </div>
      <div
        className="relative mx-auto mt-6 min-h-0 w-full max-w-[20rem] flex-1"
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
      <div className="mt-6 flex shrink-0 items-center justify-center gap-4">
        <Button variant="secondary" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={() => onConfirm(front)} disabled={saving}>
          <Check size={18} />{' '}
          {saving ? 'Saving…' : front === 'new' ? 'Use new' : 'Keep current'}
        </Button>
      </div>
    </div>,
    document.body
  );
}

export function PolaroidRoute() {
  useTableSync('polaroids', qk.polaroids.all());
  const upsert = useUpsertPolaroid();
  const { data: today } = useTodayPolaroid();
  const { data: allPhotos } = usePolaroids();
  const [camOpen, setCamOpen] = useState(false);
  const [pending, setPending] = useState<{ blob: Blob; url: string } | null>(
    null
  );
  // null → closed; otherwise the album index the full-screen viewer opens on.
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [params, setParams] = useSearchParams();
  const day = todayKey();

  const openViewer = (d: string) => {
    const i = (allPhotos ?? []).findIndex((p) => p.day === d);
    if (i >= 0) setViewerIndex(i);
  };

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
      <PageHeader title="Polaroid" />

      <TodayCard
        onOpenCamera={() => setCamOpen(true)}
        onOpen={() => openViewer(day)}
      />

      <section className="space-y-2">
        <h2 className="eyebrow">Our album</h2>
        <Gallery onOpen={openViewer} />
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

      {viewerIndex !== null && allPhotos && allPhotos.length > 0 && (
        <PolaroidViewer
          photos={allPhotos}
          initialIndex={viewerIndex}
          onClose={() => setViewerIndex(null)}
        />
      )}
    </div>
  );
}
