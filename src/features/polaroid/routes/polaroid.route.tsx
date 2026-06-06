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
      <Card className="flex flex-col items-center gap-3 py-8 text-center">
        <p className="text-sm text-muted">No photo for today yet.</p>
        <Button onClick={onOpenCamera}>
          <Camera size={18} /> Take today's photo
        </Button>
      </Card>
    );
  }

  return (
    <Card className="space-y-3">
      <div className="overflow-hidden rounded bg-black">
        <PolaroidImage
          path={today.image_path}
          className="aspect-square w-full object-cover"
        />
      </div>
      <Input
        defaultValue={today.caption ?? ''}
        placeholder="Add a caption…"
        onBlur={(e) => {
          if (e.target.value !== (today.caption ?? '')) {
            setCaption.mutate({ day, caption: e.target.value });
          }
        }}
      />
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
    <div className="grid grid-cols-2 gap-3">
      {past.map((p) => (
        <div key={p.id} className="rounded-lg bg-white p-2 pb-5 shadow">
          <PolaroidImage
            path={p.image_path}
            className="aspect-square w-full rounded-sm object-cover"
          />
          <p className="mt-1 text-center text-xs text-neutral-700">
            {DateTime.fromISO(p.day).toFormat('LLL d')}
            {p.caption ? ` · ${p.caption}` : ''}
          </p>
        </div>
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
    <div className="space-y-5">
      <PageHeader
        title="Polaroid"
        subtitle="One photo a day, taken in the moment"
      />
      <TodayCard onOpenCamera={() => setCamOpen(true)} />
      <div>
        <h2 className="mb-2 text-sm font-semibold text-muted">Our album</h2>
        <Gallery />
      </div>
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
