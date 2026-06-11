import { useState } from 'react';
import { Camera } from 'lucide-react';
import { DateTime } from 'luxon';
import { qk } from '@kernel/query';
import { useTableSync } from '@kernel/realtime';
import {
  Button,
  Card,
  CameraCapture,
  Empty,
  Input,
  LoadingScreen,
  PageHeader,
  toast,
} from '@kernel/ui';
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
            className="aspect-square w-full"
          />
        </div>
      </figure>

      <div className="space-y-3">
        <span className="eyebrow">In her hand</span>
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
  return (
    <div className="curtain-stagger grid grid-cols-2 gap-5">
      {past.map((p, i) => (
        <figure
          key={p.id}
          className="marble gilt-hairline lift-press m-0 p-2.5 pb-4 shadow-loge"
          style={{ '--i': i } as React.CSSProperties}
        >
          <PolaroidImage path={p.image_path} className="aspect-square w-full" />
          <figcaption className="mt-3 text-center">
            <span className="block font-sans text-[0.6875rem] font-semibold uppercase tracking-[0.22em] text-copper">
              {DateTime.fromISO(p.day).toFormat('LLL d')}
            </span>
            {p.caption && (
              <span className="mt-1 block font-display text-base italic leading-snug text-brown">
                {p.caption}
              </span>
            )}
          </figcaption>
        </figure>
      ))}
    </div>
  );
}

export function PolaroidRoute() {
  useTableSync('polaroids', qk.polaroids.all());
  const upsert = useUpsertPolaroid();
  const [camOpen, setCamOpen] = useState(false);
  const day = todayKey();

  const onCapture = (blob: Blob) => {
    setCamOpen(false);
    upsert.mutate(
      { day, blob },
      {
        onSuccess: () => toast.success('Polaroid saved 📸'),
        onError: (e) => toast.error(e.message),
      }
    );
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
        <CameraCapture
          facingMode="user"
          onCapture={onCapture}
          onCancel={() => setCamOpen(false)}
        />
      )}
    </div>
  );
}
