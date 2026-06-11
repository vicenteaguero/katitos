import { useState, type CSSProperties } from 'react';
import { Camera, Plus, Trash2 } from 'lucide-react';
import { DateTime } from 'luxon';
import { qk } from '@kernel/query';
import { useTableSync } from '@kernel/realtime';
import {
  Button,
  Card,
  CameraCapture,
  Empty,
  Fab,
  Field,
  IconButton,
  Input,
  LoadingScreen,
  PageHeader,
  Sheet,
  Textarea,
  toast,
} from '@kernel/ui';
import { useFlowers } from '../api/flowers.queries';
import { useDeleteFlower, useUpsertFlower } from '../api/flowers.mutations';
import { FlowerImage } from '../components/flower-image';
import { todayDate } from '../types';

export function FlowersRoute() {
  useTableSync('flowers', qk.flowers.list());
  const { data: flowers, isLoading } = useFlowers();
  const upsert = useUpsertFlower();
  const del = useDeleteFlower();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [camOpen, setCamOpen] = useState(false);
  const [occasionDate, setOccasionDate] = useState(todayDate());
  const [note, setNote] = useState('');

  const openSheet = () => {
    setOccasionDate(todayDate());
    setNote('');
    setSheetOpen(true);
  };

  const onCapture = (blob: Blob) => {
    setCamOpen(false);
    upsert.mutate(
      { occasionDate, blob, note: note.trim() || null },
      {
        onSuccess: () => {
          toast.success('Bouquet saved 💐');
          setSheetOpen(false);
        },
        onError: (e) => toast.error(e.message),
      }
    );
  };

  const onDelete = (id: string) => {
    if (!confirm('Delete this bouquet?')) return;
    del.mutate(id, {
      onSuccess: () => toast.success('Bouquet removed'),
      onError: (e) => toast.error(e.message),
    });
  };

  return (
    <div className="curtain-reveal space-y-act">
      <PageHeader
        title="Flowers"
        subtitle="A bouquet for every monthsversary"
      />

      {/* The lit stage: a marble pedestal under a breathing footlight pool —
          where the bouquet is set down like a curtain-raise gift. */}
      <section className="flower-stage relative">
        <p className="eyebrow mb-7">On the pedestal</p>
        <div className="marble gilt-hairline relative z-[1] px-stage py-8 text-center shadow-loge">
          <span
            className="gilt-text candle-flicker block text-5xl leading-none"
            aria-hidden="true"
          >
            ❀
          </span>
          <p className="mt-4 font-display text-2xl font-medium italic tracking-tight">
            Flowers that cross the distance
          </p>
          <div
            className="mx-auto mt-4 h-px w-16 bg-success"
            aria-hidden="true"
          />
        </div>
      </section>

      {isLoading ? (
        <LoadingScreen />
      ) : !flowers || flowers.length === 0 ? (
        <Empty
          icon="❀"
          title="No bouquets yet"
          hint="Set down the first one on the 15th."
        />
      ) : (
        <section className="space-y-7">
          <p className="eyebrow">The bouquets</p>
          <div className="grid grid-cols-2 gap-stage">
            {flowers.map((f, i) => (
              <Card
                key={f.id}
                className="flower-bloom space-y-3 p-3"
                style={{ '--i': i } as CSSProperties}
              >
                {f.image_path && (
                  <div className="gilt-hairline-flat overflow-hidden bg-bg">
                    <FlowerImage
                      path={f.image_path}
                      className="aspect-square w-full object-cover"
                    />
                  </div>
                )}
                <div className="flex items-start justify-between gap-1">
                  <div className="min-w-0">
                    <p className="font-display text-lg font-medium leading-tight tracking-tight text-fg">
                      {DateTime.fromISO(f.occasion_date).toFormat('LLL d')}
                    </p>
                    <p className="font-sans text-xs font-medium tabular-nums text-copper">
                      {DateTime.fromISO(f.occasion_date).toFormat('yyyy')}
                    </p>
                    {f.note && (
                      <p className="mt-1.5 break-words font-sans text-xs leading-relaxed text-muted">
                        {f.note}
                      </p>
                    )}
                  </div>
                  <IconButton
                    label="Delete bouquet"
                    onClick={() => onDelete(f.id)}
                  >
                    <Trash2 size={16} />
                  </IconButton>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      <Fab label="Add bouquet" onClick={openSheet}>
        <Plus size={24} />
      </Fab>

      <Sheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Add bouquet"
      >
        <div className="space-y-5">
          <Field label="Occasion date">
            <Input
              type="date"
              value={occasionDate}
              onChange={(e) => setOccasionDate(e.target.value)}
            />
          </Field>
          <Field label="Note">
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="A little something about this bouquet…"
            />
          </Field>
          <Button
            full
            onClick={() => setCamOpen(true)}
            disabled={upsert.isPending}
          >
            <Camera size={18} />
            {upsert.isPending ? 'Setting it down…' : 'Take photo'}
          </Button>
        </div>
      </Sheet>

      {camOpen && (
        <CameraCapture
          facingMode="environment"
          onCapture={onCapture}
          onCancel={() => setCamOpen(false)}
        />
      )}
    </div>
  );
}
