import { useState } from 'react';
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
    <div className="space-y-5">
      <PageHeader title="Flowers" subtitle="Every monthsversary 💐" />

      {isLoading ? (
        <LoadingScreen />
      ) : !flowers || flowers.length === 0 ? (
        <Empty
          icon="💐"
          title="No bouquets yet"
          hint="Add the first one on the 15th."
        />
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {flowers.map((f) => (
            <Card key={f.id} className="space-y-2 p-2">
              {f.image_path && (
                <div className="overflow-hidden rounded bg-black">
                  <FlowerImage
                    path={f.image_path}
                    className="aspect-square w-full object-cover"
                  />
                </div>
              )}
              <div className="flex items-start justify-between gap-1">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">
                    {DateTime.fromISO(f.occasion_date).toFormat('LLL d, yyyy')}
                  </p>
                  {f.note && (
                    <p className="text-xs text-muted break-words">{f.note}</p>
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
      )}

      <Fab label="Add bouquet" onClick={openSheet}>
        <Plus size={24} />
      </Fab>

      <Sheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Add bouquet"
      >
        <div className="space-y-3">
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
            {upsert.isPending ? 'Saving…' : 'Take photo'}
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
