import { useState } from 'react';
import { Camera, Plus, Star, Trash2 } from 'lucide-react';
import { useTableSync } from '@kernel/realtime';
import { qk } from '@kernel/query';
import { cn } from '@kernel/lib';
import {
  Button,
  CameraCapture,
  Card,
  Empty,
  IconButton,
  Input,
  SectionHeader,
  Sheet,
} from '@kernel/ui';
import { useSummerReviews } from '../../api/summer.queries';
import { useAddReview, useDeleteReview } from '../../api/summer.mutations';
import { SummerPhoto } from '../../components/summer-photo';
import {
  COUNTRIES,
  REVIEW_CATEGORIES,
  type CountryFilter,
  type Trip,
} from '../../types';

function Stars({
  value,
  onChange,
  size = 18,
}: {
  value: number;
  onChange?: (v: number) => void;
  size?: number;
}) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={!onChange}
          onClick={() => onChange?.(n)}
          aria-label={`${n} stars`}
          className={cn(onChange && 'active:scale-90')}
        >
          <Star
            style={{ width: size, height: size }}
            className={n <= value ? 'fill-gold text-gold' : 'text-muted'}
          />
        </button>
      ))}
    </div>
  );
}

const EMPTY = {
  category: 'restaurant',
  name: '',
  country: '',
  stars: 0,
};

function catMeta(value: string) {
  return (
    REVIEW_CATEGORIES.find((c) => c.value === value) ?? REVIEW_CATEGORIES[7]
  );
}

export function ReviewsTab({
  trip,
  country,
}: {
  trip: Trip;
  country: CountryFilter;
}) {
  useTableSync('trip_reviews', qk.trips.reviews(trip.id), { enabled: true });
  const { data: reviews } = useSummerReviews(trip.id);
  const addReview = useAddReview();
  const delReview = useDeleteReview();

  const [adding, setAdding] = useState(false);
  const [cam, setCam] = useState(false);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [form, setForm] = useState({ ...EMPTY });

  const list = (reviews ?? []).filter(
    (r) => country === 'all' || r.country === country
  );

  const submit = () => {
    if (!form.name.trim()) return;
    addReview.mutate(
      {
        tripId: trip.id,
        category: form.category,
        name: form.name.trim(),
        country: form.country || (country === 'all' ? null : country),
        stars: form.stars || null,
        notes: null,
        link: null,
        blob,
      },
      {
        onSuccess: () => {
          setAdding(false);
          setBlob(null);
          setForm({ ...EMPTY });
        },
      }
    );
  };

  return (
    <section className="space-y-4">
      <SectionHeader
        label="Reviews"
        action={
          <Button size="sm" onClick={() => setAdding(true)}>
            <Plus size={15} /> Add review
          </Button>
        }
      />

      {list.length === 0 ? (
        <Empty
          icon={<Star className="h-11 w-11" strokeWidth={1.25} />}
          title="No reviews yet"
          hint="Rate a restaurant, a stay, a view…"
        />
      ) : (
        <div className="space-y-2.5">
          {list.map((r) => {
            const meta = catMeta(r.category);
            return (
              <Card key={r.id} className="flex gap-3 p-3">
                {r.image_path ? (
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-surface-2">
                    <SummerPhoto path={r.image_path} className="h-16 w-16" />
                  </div>
                ) : (
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-2xl">
                    {meta.emoji}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="min-w-0 truncate font-display text-base font-semibold text-fg">
                      {r.name}
                    </p>
                    <IconButton
                      label="Delete"
                      onClick={() =>
                        delReview.mutate({ id: r.id, tripId: trip.id })
                      }
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </IconButton>
                  </div>
                  <div className="flex items-center gap-2">
                    {r.stars != null && <Stars value={r.stars} size={14} />}
                    <span className="font-sans text-[0.7rem] uppercase tracking-wide text-muted">
                      {meta.label}
                    </span>
                  </div>
                  {r.notes && (
                    <p className="mt-1 line-clamp-2 font-sans text-xs text-muted">
                      {r.notes}
                    </p>
                  )}
                  {r.link && (
                    <a
                      href={r.link}
                      target="_blank"
                      rel="noreferrer"
                      className="font-sans text-[0.7rem] text-copper underline"
                    >
                      open link
                    </a>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {cam && (
        <CameraCapture
          facingMode="environment"
          onCapture={(b) => {
            setBlob(b);
            setCam(false);
          }}
          onCancel={() => setCam(false)}
        />
      )}

      <Sheet
        open={adding}
        onClose={() => setAdding(false)}
        title="Add a review"
      >
        <div className="space-y-3">
          <Input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Name — e.g. Café Littera"
            autoFocus
          />

          {/* Stars, unlabelled and centred. */}
          <div className="flex justify-center py-0.5">
            <Stars
              value={form.stars}
              onChange={(v) => setForm((f) => ({ ...f, stars: v }))}
              size={32}
            />
          </div>

          {/* Category — a quick pill row, no menu. */}
          <div className="flex flex-wrap gap-1.5">
            {REVIEW_CATEGORIES.map((c) => {
              const active = form.category === c.value;
              return (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, category: c.value }))}
                  className={cn(
                    'lift-press rounded-full px-3 py-1.5 font-sans text-xs font-semibold',
                    active
                      ? 'bg-accent text-accent-fg'
                      : 'bg-surface-2 text-muted'
                  )}
                >
                  {c.emoji} {c.label}
                </button>
              );
            })}
          </div>

          {/* Country — two flags, tap to set. */}
          <div className="flex gap-2">
            {COUNTRIES.map((co) => {
              const active = form.country === co.code;
              return (
                <button
                  key={co.code}
                  type="button"
                  onClick={() =>
                    setForm((f) => ({ ...f, country: active ? '' : co.code }))
                  }
                  className={cn(
                    'lift-press flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2.5 font-sans text-sm font-semibold',
                    active
                      ? 'bg-accent text-accent-fg'
                      : 'bg-surface-2 text-muted'
                  )}
                >
                  <span className="text-lg leading-none">{co.flag}</span>
                  {co.label}
                </button>
              );
            })}
          </div>

          <Button variant="secondary" full onClick={() => setCam(true)}>
            <Camera size={16} /> {blob ? 'Photo added ✓' : 'Add a photo'}
          </Button>
          <Button full onClick={submit} disabled={addReview.isPending}>
            Save review
          </Button>
        </div>
      </Sheet>
    </section>
  );
}
