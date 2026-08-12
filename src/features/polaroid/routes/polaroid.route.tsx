import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { Camera, ImagePlus } from 'lucide-react';
import { DateTime } from 'luxon';
import { usePartner } from '@kernel/auth';
import { qk } from '@kernel/query';
import { useTableSync } from '@kernel/realtime';
import { BUCKETS, useSignedUrls } from '@kernel/storage';
import {
  Button,
  Empty,
  IconButton,
  Input,
  Skeleton,
  SquareCropper,
  toast,
  useTopBarAction,
} from '@kernel/ui';
import { PolaroidCamera } from '../components/polaroid-camera';
import { PolaroidViewer } from '../components/polaroid-viewer';
import { DoublePolaroid, type Focus } from '../components/double-polaroid';
import { CatchUpSheet } from '../components/catch-up-sheet';
import { PolaroidImage } from '../components/polaroid-image';
import { usePolaroidPages } from '../api/polaroid.queries';
import {
  polaroidErrorMessage,
  useSetPolaroidCaption,
  useUpsertPolaroid,
} from '../api/polaroid.mutations';
import { groupByDay, localDay, openDays } from '../lib/polaroid-days';
import type { PolaroidDay } from '../lib/polaroid-days';
import type { Polaroid } from '../types';

/** Her pet name for his side of a plate, and vice versa. */
function petNameOf(role: string | null | undefined): string {
  return role === 'a' ? 'Katito' : 'Katita';
}

export function PolaroidRoute() {
  useTableSync('polaroids', qk.polaroids.all());
  const { self, partner } = usePartner();
  const upsert = useUpsertPolaroid();
  const setCaption = useSetPolaroidCaption();

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    usePolaroidPages();

  const [camOpen, setCamOpen] = useState(false);
  const [catchUpOpen, setCatchUpOpen] = useState(false);
  const [cropping, setCropping] = useState<{ day: string; file: File } | null>(
    null
  );
  const [viewer, setViewer] = useState<Polaroid | null>(null);
  const [todayFocus, setTodayFocus] = useState<Focus>(null);
  const [params, setParams] = useSearchParams();

  const selfId = self?.user_id ?? null;
  const myToday = localDay(self?.timezone);
  const partnerName = petNameOf(partner?.role);

  const rows = useMemo(() => (data?.pages ?? []).flat(), [data]);
  const days = useMemo(() => groupByDay(rows, selfId), [rows, selfId]);

  // One signed-URL request for every thumbnail on screen, instead of two per
  // photo fired from inside each child.
  const { data: urls } = useSignedUrls(
    BUCKETS.polaroids,
    rows.map((r) => r.image_path)
  );

  const today = days.find((d) => d.day === myToday) ?? {
    day: myToday,
    shared: null,
    mine: null,
    theirs: null,
    extras: [],
    isLegacy: false,
  };
  const past = days.filter((d) => d.day !== myToday);

  const eligible = useMemo(
    () => openDays(self?.timezone, partner?.timezone),
    [self?.timezone, partner?.timezone]
  );
  const filled = useMemo(
    () => new Set(days.filter((d) => d.mine != null).map((d) => d.day)),
    [days]
  );
  const openSet = useMemo(() => new Set(eligible), [eligible]);

  // The middle nav button deep-links here with ?shoot=1 → straight to camera.
  useEffect(() => {
    if (params.get('shoot') === '1') {
      setCamOpen(true);
      params.delete('shoot');
      setParams(params, { replace: true });
    }
  }, [params, setParams]);

  useTopBarAction(
    <IconButton
      label="Add from your photos"
      className="h-9 w-9"
      onClick={() => setCatchUpOpen(true)}
    >
      <ImagePlus className="h-5 w-5" />
    </IconButton>,
    []
  );

  const save = (day: string, blob: Blob) =>
    upsert.mutate(
      { day, blob },
      {
        onSuccess: () => toast.success('Saved 📸'),
        onError: (e) => toast.error(polaroidErrorMessage(e)),
      }
    );

  const focusedPhoto =
    todayFocus === 'mine'
      ? today.mine
      : todayFocus === 'theirs'
        ? today.theirs
        : null;

  return (
    <div className="curtain-reveal space-y-8">
      {/* ── Today ─────────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-center font-sans text-[0.625rem] font-semibold uppercase tracking-[0.3em] text-copper/80">
          {DateTime.fromISO(myToday).toFormat('cccc, LLL d')}
        </h2>

        {isLoading ? (
          <div className="mx-auto flex w-full max-w-[22rem] gap-2">
            <Skeleton className="aspect-[3/4] flex-1" rounded="md" />
            <Skeleton className="aspect-[3/4] flex-1" rounded="md" />
          </div>
        ) : (
          <DoublePolaroid
            day={today}
            urls={urls}
            partnerName={partnerName}
            partnerZone={partner?.timezone}
            focus={todayFocus}
            onFocusChange={setTodayFocus}
            onOpen={setViewer}
            isToday
            stillOpen
            onShoot={() => setCamOpen(true)}
          />
        )}

        {/* The focused plate's caption — either of us may write on either one. */}
        {focusedPhoto && (
          <Input
            key={focusedPhoto.id}
            defaultValue={focusedPhoto.caption ?? ''}
            placeholder={
              todayFocus === 'mine'
                ? 'Say something about your day…'
                : `Write something on ${partnerName}'s…`
            }
            className="mx-auto max-w-[22rem] border-0 bg-transparent px-0 py-1 text-center font-display text-lg italic text-fg shadow-none placeholder:italic placeholder:text-muted focus:shadow-none"
            onBlur={(e) => {
              if (e.target.value !== (focusedPhoto.caption ?? '')) {
                setCaption.mutate(
                  { id: focusedPhoto.id, caption: e.target.value },
                  { onError: (err) => toast.error(polaroidErrorMessage(err)) }
                );
              }
            }}
          />
        )}

        {today.mine ? (
          <div className="flex justify-center">
            <Button variant="secondary" onClick={() => setCamOpen(true)}>
              <Camera size={18} /> Retake mine
            </Button>
          </div>
        ) : (
          !isLoading && (
            <div className="flex justify-center">
              <Button onClick={() => setCamOpen(true)}>
                <Camera size={18} /> Take today&apos;s photo
              </Button>
            </div>
          )
        )}
      </section>

      {/* ── The album ─────────────────────────────────────────────────── */}
      <section className="space-y-2">
        <h2 className="eyebrow">Our album</h2>
        {isLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-56 w-full" rounded="lg" />
            <Skeleton className="h-56 w-full" rounded="lg" />
          </div>
        ) : past.length === 0 ? (
          <Empty
            icon="📸"
            title="Your album starts today"
            hint="Past days collect here."
          />
        ) : (
          <Gallery
            days={past}
            urls={urls}
            partnerName={partnerName}
            partnerZone={partner?.timezone}
            openSet={openSet}
            onCatchUp={() => setCatchUpOpen(true)}
            onOpen={setViewer}
            hasMore={!!hasNextPage}
            loadingMore={isFetchingNextPage}
            onLoadMore={() => void fetchNextPage()}
          />
        )}
      </section>

      {camOpen && (
        <PolaroidCamera
          facingMode="user"
          onCapture={(blob) => {
            setCamOpen(false);
            save(myToday, blob);
          }}
          onCancel={() => setCamOpen(false)}
        />
      )}

      <CatchUpSheet
        open={catchUpOpen}
        onClose={() => setCatchUpOpen(false)}
        days={eligible}
        filled={filled}
        selfZone={self?.timezone}
        partnerZone={partner?.timezone}
        partnerName={partnerName}
        onPick={(day, file) => {
          setCatchUpOpen(false);
          setCropping({ day, file });
        }}
      />

      {cropping && (
        <SquareCropper
          file={cropping.file}
          confirmLabel="Save this day"
          onCancel={() => setCropping(null)}
          onCropped={(blob) => {
            const { day } = cropping;
            setCropping(null);
            save(day, blob);
          }}
        />
      )}

      {viewer && (
        <PolaroidViewer
          photos={[viewer]}
          initialIndex={0}
          onClose={() => setViewer(null)}
        />
      )}
    </div>
  );
}

/** The film roll: months as chapters, each day as one pair (or one plate). */
function Gallery({
  days,
  urls,
  partnerName,
  partnerZone,
  openSet,
  onCatchUp,
  onOpen,
  hasMore,
  loadingMore,
  onLoadMore,
}: {
  days: PolaroidDay[];
  urls?: Map<string, string>;
  partnerName: string;
  partnerZone: string | null | undefined;
  /** Days still writable from here — my love's today included. */
  openSet: Set<string>;
  onCatchUp: () => void;
  onOpen: (p: Polaroid) => void;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
}) {
  const months: { key: string; label: string; items: PolaroidDay[] }[] = [];
  for (const d of days) {
    const key = d.day.slice(0, 7);
    const reel = months[months.length - 1];
    if (reel && reel.key === key) reel.items.push(d);
    else
      months.push({
        key,
        label: DateTime.fromISO(d.day).toFormat('LLLL yyyy'),
        items: [d],
      });
  }

  return (
    <div className="space-y-7">
      {months.map((m) => (
        <section key={m.key} className="space-y-5">
          <h3 className="text-center font-sans text-[0.625rem] font-semibold uppercase tracking-[0.3em] text-copper/80">
            {m.label}
          </h3>
          <div className="space-y-7">
            {m.items.map((d) => (
              <figure key={d.day} className="m-0 space-y-2">
                <figcaption className="text-center font-sans text-[0.6875rem] font-semibold uppercase tracking-[0.22em] text-copper">
                  {DateTime.fromISO(d.day).toFormat('ccc, LLL d')}
                </figcaption>
                {d.isLegacy && d.shared ? (
                  // Days from when we lived the same day: one plate, ours.
                  <button
                    type="button"
                    onClick={() => onOpen(d.shared!)}
                    className="marble lift-press mx-auto block w-full max-w-[22rem] rounded-lg p-3 pb-5 shadow-loge"
                  >
                    <PolaroidImage
                      path={d.shared.image_path}
                      src={urls?.get(d.shared.image_path)}
                      className="aspect-square w-full"
                    />
                    {d.shared.caption && (
                      <span className="mt-3 block px-1 text-center font-display text-lg italic leading-snug text-brown">
                        {d.shared.caption}
                      </span>
                    )}
                  </button>
                ) : (
                  <DoublePolaroid
                    day={d}
                    urls={urls}
                    partnerName={partnerName}
                    partnerZone={partnerZone}
                    stillOpen={openSet.has(d.day)}
                    onShoot={
                      // Her today, still fillable from here — but only via the
                      // deliberate path, never the camera (which is always
                      // "now", and now is a different date).
                      openSet.has(d.day) ? onCatchUp : undefined
                    }
                    onOpen={onOpen}
                  />
                )}
              </figure>
            ))}
          </div>
        </section>
      ))}

      {hasMore && (
        <div className="flex justify-center pt-2">
          <Button
            variant="secondary"
            onClick={onLoadMore}
            disabled={loadingMore}
          >
            {loadingMore ? 'Loading…' : 'Older days'}
          </Button>
        </div>
      )}
    </div>
  );
}
