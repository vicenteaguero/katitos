import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { ChevronLeft, ImagePlus, Trash2 } from 'lucide-react';
import { useUserId, useMembers } from '@kernel/auth';
import type { TablesUpdate } from '@kernel/supabase';
import { qk } from '@kernel/query';
import { useTableSync } from '@kernel/realtime';
import {
  Badge,
  Button,
  Card,
  CardTitle,
  CameraCapture,
  Empty,
  IconButton,
  Input,
  LoadingScreen,
  Select,
  Textarea,
  toast,
} from '@kernel/ui';
import {
  useAddDatePhoto,
  useDeleteDatePhoto,
  useSetRating,
  useUpdateDate,
} from '../api/dates.mutations';
import { useDate, useDatePhotos } from '../api/dates.queries';
import { DatePhoto } from '../components/date-photo';
import { Stars, StarsDisplay } from '../components/stars';
import {
  asDateStatus,
  STATUS_LABELS,
  STATUS_TONES,
  type DatePhoto as DatePhotoRow,
  type DateRating,
  type DateWithRatings,
} from '../types';

// ── Details + status ────────────────────────────────────────────────────────
function DetailsCard({ date }: { date: DateWithRatings }) {
  const update = useUpdateDate();
  const status = asDateStatus(date.status);

  const onStatus = (value: string) => {
    update.mutate(
      { id: date.id, status: value },
      { onError: (e) => toast.error(e.message) }
    );
  };

  const savePatch = (
    current: string,
    value: string,
    patch: TablesUpdate<'dates'>
  ) => {
    if (value === current) return;
    update.mutate(
      { id: date.id, ...patch },
      { onError: (e) => toast.error(e.message) }
    );
  };

  return (
    <Card className="footlight space-y-3">
      {/* The featured card — lifted by tone alone */}
      <div className="relative -mx-7 -mt-7 mb-2 rounded-lg bg-surface-2 px-7 py-8">
        <span
          aria-hidden
          className="pointer-events-none absolute right-5 top-5 select-none font-display text-2xl leading-none text-muted/60"
        >
          ♦
        </span>
        <p className="eyebrow mb-3 justify-start before:hidden">
          Featured Card
        </p>
        <div className="flex items-start justify-between gap-3">
          <h1 className="min-w-0 font-display text-4xl font-semibold leading-[1.05] tracking-tight text-accent">
            {date.title}
          </h1>
          <Badge tone={STATUS_TONES[status]} className="shrink-0">
            {STATUS_LABELS[status]}
          </Badge>
        </div>
      </div>
      <label className="block space-y-1.5">
        <span className="block font-sans text-xs font-semibold uppercase tracking-[0.18em] text-gold">
          Status
        </span>
        <Select
          value={status}
          onChange={(e) => onStatus(e.target.value)}
          disabled={update.isPending}
        >
          <option value="idea">Idea</option>
          <option value="scheduled">Scheduled</option>
          <option value="done">Done</option>
          <option value="cancelled">Cancelled</option>
        </Select>
      </label>
      <label className="block space-y-1.5">
        <span className="block font-sans text-xs font-semibold uppercase tracking-[0.18em] text-gold">
          Place
        </span>
        <Input
          defaultValue={date.place ?? ''}
          placeholder="Where to?"
          onBlur={(e) =>
            savePatch(date.place ?? '', e.target.value, {
              place: e.target.value || null,
            })
          }
        />
      </label>
      <label className="block space-y-1.5">
        <span className="block font-sans text-xs font-semibold uppercase tracking-[0.18em] text-gold">
          Category
        </span>
        <Input
          defaultValue={date.category ?? ''}
          placeholder="Dinner, movie, outdoors…"
          onBlur={(e) =>
            savePatch(date.category ?? '', e.target.value, {
              category: e.target.value || null,
            })
          }
        />
      </label>
    </Card>
  );
}

// ── Budget ──────────────────────────────────────────────────────────────────
const CURRENCIES = ['USD', 'CLP', 'RUB', 'EUR'] as const;

function BudgetCard({ date }: { date: DateWithRatings }) {
  const update = useUpdateDate();

  const saveAmount = (raw: string) => {
    const next = raw.trim() === '' ? null : Number(raw);
    if (next != null && Number.isNaN(next)) return;
    if (next === (date.budget_amount ?? null)) return;
    update.mutate(
      { id: date.id, budget_amount: next },
      { onError: (e) => toast.error(e.message) }
    );
  };

  const saveCurrency = (currency: string) => {
    update.mutate(
      { id: date.id, budget_currency: currency },
      { onError: (e) => toast.error(e.message) }
    );
  };

  return (
    <Card className="space-y-2">
      <CardTitle>Budget</CardTitle>
      <div className="flex gap-2">
        <Input
          type="number"
          inputMode="decimal"
          min={0}
          step="0.01"
          className="flex-1"
          defaultValue={date.budget_amount ?? ''}
          placeholder="0"
          onBlur={(e) => saveAmount(e.target.value)}
        />
        <Select
          className="w-28"
          value={date.budget_currency ?? 'USD'}
          onChange={(e) => saveCurrency(e.target.value)}
          disabled={update.isPending}
        >
          {CURRENCIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
      </div>
    </Card>
  );
}

// ── Free-text notes (what we ate / notes) ────────────────────────────────────
function NotesCard({
  value,
  title,
  placeholder,
  onSave,
}: {
  value: string;
  title: string;
  placeholder: string;
  onSave: (value: string) => void;
}) {
  return (
    <Card className="space-y-2">
      <CardTitle>{title}</CardTitle>
      <Textarea
        defaultValue={value}
        placeholder={placeholder}
        onBlur={(e) => {
          if (e.target.value !== value) onSave(e.target.value);
        }}
      />
    </Card>
  );
}

function NotesSection({ date }: { date: DateWithRatings }) {
  const update = useUpdateDate();
  const save = (patch: TablesUpdate<'dates'>) => {
    update.mutate(
      { id: date.id, ...patch },
      { onError: (e) => toast.error(e.message) }
    );
  };
  return (
    <>
      <NotesCard
        value={date.what_we_ate ?? ''}
        title="What we ate"
        placeholder="The food, the drinks…"
        onSave={(v) => save({ what_we_ate: v || null })}
      />
      <NotesCard
        value={date.notes ?? ''}
        title="Notes"
        placeholder="Anything to remember"
        onSave={(v) => save({ notes: v || null })}
      />
    </>
  );
}

// ── My rating ────────────────────────────────────────────────────────────────
function MyRatingCard({ date }: { date: DateWithRatings }) {
  const userId = useUserId();
  const setRating = useSetRating();
  const mine = date.date_ratings.find((r) => r.user_id === userId) ?? null;

  const onStars = (stars: number) => {
    setRating.mutate(
      { dateId: date.id, stars, review: mine?.review ?? null },
      {
        onSuccess: () => toast.success('Rating saved'),
        onError: (e) => toast.error(e.message),
      }
    );
  };

  const onReview = (review: string) => {
    if (review === (mine?.review ?? '')) return;
    if (mine?.stars == null) {
      toast.error('Pick a star rating first');
      return;
    }
    setRating.mutate(
      { dateId: date.id, stars: mine.stars, review: review || null },
      { onError: (e) => toast.error(e.message) }
    );
  };

  return (
    <Card className="space-y-3">
      <CardTitle>My rating</CardTitle>
      <Stars
        value={mine?.stars ?? null}
        onChange={onStars}
        disabled={setRating.isPending}
      />
      <Textarea
        defaultValue={mine?.review ?? ''}
        key={mine?.review ?? ''}
        placeholder="What did you think?"
        onBlur={(e) => onReview(e.target.value)}
      />
    </Card>
  );
}

// ── Both partners' ratings ───────────────────────────────────────────────────
function RatingsCard({ date }: { date: DateWithRatings }) {
  const { data: members } = useMembers();
  const ratings = date.date_ratings.filter((r) => r.stars != null);
  if (ratings.length === 0) return null;

  const memberName = (r: DateRating): string =>
    members?.find((m) => m.user_id === r.user_id)?.display_name ?? 'Someone';

  return (
    <Card className="space-y-4">
      <CardTitle>Ratings</CardTitle>
      <ul className="space-y-0">
        {ratings.map((r, i) => (
          <li key={r.user_id} className="space-y-2 py-3 first:pt-0">
            {/* Both partners' scores stitched by the two-color seam */}
            {i > 0 && <div className="seam mb-3 -mt-3" aria-hidden />}
            <div className="flex items-center justify-between gap-2">
              <span className="font-display text-lg italic text-fg">
                {memberName(r)}
              </span>
              <StarsDisplay value={r.stars} />
            </div>
            {r.review && (
              <p className="font-display text-base italic leading-snug text-muted">
                “{r.review}”
              </p>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}

// ── Photos ───────────────────────────────────────────────────────────────────
function PhotoTile({ photo }: { photo: DatePhotoRow }) {
  const del = useDeleteDatePhoto();
  const onDelete = () => {
    if (!confirm('Delete this photo?')) return;
    del.mutate(
      { id: photo.id, dateId: photo.date_id },
      {
        onSuccess: () => toast.success('Photo deleted'),
        onError: (e) => toast.error(e.message),
      }
    );
  };
  return (
    <div className="relative overflow-hidden rounded-lg bg-surface-2">
      <DatePhoto
        path={photo.image_path}
        alt={photo.caption ?? 'date photo'}
        className="aspect-square w-full object-cover"
      />
      <IconButton
        label="Delete photo"
        onClick={onDelete}
        disabled={del.isPending}
        className="absolute right-1.5 top-1.5 h-8 w-8 rounded bg-bg/70 text-fg active:bg-bg/90"
      >
        <Trash2 className="h-4 w-4" />
      </IconButton>
      {photo.caption && (
        <p className="absolute inset-x-0 bottom-0 truncate bg-bg/70 px-2.5 py-1.5 font-display text-sm italic text-fg">
          {photo.caption}
        </p>
      )}
    </div>
  );
}

function PhotosCard({ dateId }: { dateId: string }) {
  const { data: photos, isLoading } = useDatePhotos(dateId);
  const addPhoto = useAddDatePhoto();
  const [camOpen, setCamOpen] = useState(false);

  const onCapture = (blob: Blob) => {
    setCamOpen(false);
    addPhoto.mutate(
      { dateId, blob },
      {
        onSuccess: () => toast.success('Photo added 📸'),
        onError: (e) => toast.error(e.message),
      }
    );
  };

  return (
    <Card className="space-y-3">
      <div className="flex items-center justify-between">
        <CardTitle>Photos</CardTitle>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setCamOpen(true)}
          disabled={addPhoto.isPending}
        >
          <ImagePlus size={16} /> Add photo
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : !photos || photos.length === 0 ? (
        <p className="text-sm text-muted">No photos yet.</p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {photos.map((p) => (
            <PhotoTile key={p.id} photo={p} />
          ))}
        </div>
      )}

      {camOpen && (
        <CameraCapture
          facingMode="environment"
          onCapture={onCapture}
          onCancel={() => setCamOpen(false)}
        />
      )}
    </Card>
  );
}

// ── Route ────────────────────────────────────────────────────────────────────
export function DateDetailRoute() {
  const { dateId } = useParams<{ dateId: string }>();
  useTableSync('date_ratings', qk.dates.one(dateId ?? ''));

  const { data: date, isLoading, isError } = useDate(dateId);

  const backLink = (
    <Link
      to="/dates"
      className="inline-flex items-center gap-1 font-sans text-xs font-semibold uppercase tracking-[0.18em] text-gold transition hover:text-fg"
    >
      <ChevronLeft size={16} /> The Deck
    </Link>
  );

  if (!dateId) return <Empty icon="🗓️" title="No date selected" />;
  if (isLoading) return <LoadingScreen />;
  if (isError || !date) {
    return (
      <div className="space-y-4">
        {backLink}
        <Empty icon="⚠️" title="Couldn't load this date" />
      </div>
    );
  }

  return (
    <div className="curtain-reveal space-y-6">
      {backLink}
      <DetailsCard date={date} />
      <BudgetCard date={date} />
      <NotesSection date={date} />
      <MyRatingCard date={date} />
      <RatingsCard date={date} />
      <PhotosCard dateId={date.id} />
    </div>
  );
}
