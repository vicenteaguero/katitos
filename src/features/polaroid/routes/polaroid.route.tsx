import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
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
      <Card className="footlight flex flex-col items-center gap-6 py-12 text-center">
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

/** Side-by-side "keep which?" before a retake replaces today's photo. The old
 *  one is never deleted — choosing the new shot just stops showing the old. */
function CompareReplace({
  oldPath,
  newUrl,
  onKeepNew,
  onKeepOld,
  saving,
}: {
  oldPath: string;
  newUrl: string;
  onKeepNew: () => void;
  onKeepOld: () => void;
  saving: boolean;
}) {
  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-black/90 p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <p className="mt-2 text-center font-display text-2xl italic text-fg">
        Keep which one?
      </p>
      <div className="mt-6 grid flex-1 grid-cols-2 gap-3">
        <figure className="m-0 flex flex-col">
          <span className="mb-2 text-center font-sans text-[0.625rem] font-semibold uppercase tracking-[0.18em] text-muted">
            On the wall
          </span>
          <div className="marble flex-1 p-2">
            <PolaroidImage path={oldPath} full className="h-full w-full" />
          </div>
        </figure>
        <figure className="m-0 flex flex-col">
          <span className="mb-2 text-center font-sans text-[0.625rem] font-semibold uppercase tracking-[0.18em] text-gold">
            New shot
          </span>
          <div className="marble flex-1 p-2">
            <img
              src={newUrl}
              alt="New shot"
              className="h-full w-full object-cover"
            />
          </div>
        </figure>
      </div>
      <div className="mt-6 flex items-center justify-center gap-4">
        <Button variant="secondary" onClick={onKeepOld} disabled={saving}>
          Keep old
        </Button>
        <Button onClick={onKeepNew} disabled={saving}>
          <Check size={18} /> {saving ? 'Saving…' : 'Use new'}
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

  const keepNew = () => {
    if (!pending) return;
    upsert.mutate(
      { day, blob: pending.blob },
      {
        onSuccess: () => {
          toast.success('Polaroid replaced 📸');
          URL.revokeObjectURL(pending.url);
          setPending(null);
        },
        onError: (e) => toast.error(e.message),
      }
    );
  };

  const keepOld = () => {
    if (!pending) return;
    URL.revokeObjectURL(pending.url);
    setPending(null);
  };

  return (
    <div className="curtain-reveal space-y-12">
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
        <CompareReplace
          oldPath={today.image_path}
          newUrl={pending.url}
          onKeepNew={keepNew}
          onKeepOld={keepOld}
          saving={upsert.isPending}
        />
      )}
    </div>
  );
}
