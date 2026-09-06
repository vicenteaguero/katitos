import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { Camera, ImagePlus } from 'lucide-react';
import { DateTime } from 'luxon';
import { usePartner } from '@kernel/auth';
import { qk } from '@kernel/query';
import { useTableSync } from '@kernel/realtime';
import { BUCKETS, usePrefetchImages, useSignedUrls } from '@kernel/storage';
import {
  Button,
  Empty,
  IconButton,
  Input,
  PolaroidPlate,
  Skeleton,
  SquareCropper,
  toast,
  useTopBarAction,
} from '@kernel/ui';
import { PolaroidViewer } from '../components/polaroid-viewer';
import { DoublePolaroid } from '../components/double-polaroid';
import { CatchUpSheet } from '../components/catch-up-sheet';
import { PolaroidImage } from '../components/polaroid-image';
import { usePolaroidPages } from '../api/polaroid.queries';
import { usePolaroidDraft } from '../lib/draft-store';
import {
  polaroidErrorMessage,
  useSetPolaroidCaption,
  useUpsertPolaroid,
} from '../api/polaroid.mutations';
import {
  frontOf,
  groupByDay,
  localDay,
  openDays,
  type Focus,
} from '../lib/polaroid-days';
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

  const [catchUpOpen, setCatchUpOpen] = useState(false);
  /** The day a notification sent us here for - its row glows in the sheet. */
  const [urgentDay, setUrgentDay] = useState<string | null>(null);
  /** A notification asked for the camera and the browser wouldn't open it. */
  const [pulseShoot, setPulseShoot] = useState(false);
  const [cropping, setCropping] = useState<{ day: string; file: File } | null>(
    null
  );
  const [viewer, setViewer] = useState<Polaroid | null>(null);
  // Her day sits on top when you open the app. Tapping mine brings it forward.
  const [todayFocus, setTodayFocus] = useState<Focus>('theirs');
  const [params, setParams] = useSearchParams();
  // The system camera, not getUserMedia: the photo taken every single day is
  // the one that must never re-ask for permission. See PhotoButton.
  const shootRef = useRef<HTMLInputElement>(null);
  const draft = usePolaroidDraft((s) => s.draft);
  const clearDraft = usePolaroidDraft((s) => s.clearDraft);

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
  // Pull the whole page's thumbnails down at once. You opened the album to
  // scroll it, so the scroll should never be waiting on a network round-trip -
  // at ~20 KB each this is a few hundred KB once, then cached by the worker.
  usePrefetchImages(urls?.values());

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

  const openCamera = useCallback(() => shootRef.current?.click(), []);

  /**
   * A photo already taken elsewhere - the bottom bar owns the camera input so
   * that tapping it IS the gesture that opens the phone's camera. It lands here
   * as a draft; crop it and it is saved.
   */
  useEffect(() => {
    if (!draft) return;
    setCropping({ day: draft.day, file: draft.file });
    clearDraft();
  }, [draft, clearDraft]);

  /**
   * The end-of-day notification links to `?shoot=1`, wanting the camera open.
   *
   * We try, and we do not rely on it: opening a file input needs a gesture the
   * browser will not credit a notification tap with, and Safari refuses. So the
   * fallback is not an error message, it is the button below going gold and
   * pulsing under your thumb - one tap, on the thing you came here to do.
   */
  useEffect(() => {
    if (params.get('shoot') !== '1') return;
    params.delete('shoot');
    setParams(params, { replace: true });
    openCamera();
    setPulseShoot(true);
    const id = setTimeout(() => setPulseShoot(false), 8000);
    return () => clearTimeout(id);
  }, [params, setParams, openCamera]);

  /** The last-call notification links to `?catchup=<day>` - that exact day. */
  useEffect(() => {
    const day = params.get('catchup');
    if (!day) return;
    params.delete('catchup');
    setParams(params, { replace: true });
    setUrgentDay(day);
    setCatchUpOpen(true);
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

  // Whichever plate is actually in front - that's the caption you can write on.
  const frontSide = frontOf(today, todayFocus);
  const focusedPhoto = frontSide === 'mine' ? today.mine : today.theirs;

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
            onShoot={openCamera}
          />
        )}

        {/* The focused plate's caption - either of us may write on either one. */}
        {focusedPhoto && (
          <Input
            key={focusedPhoto.id}
            defaultValue={focusedPhoto.caption ?? ''}
            placeholder={
              frontSide === 'mine'
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
            <Button variant="secondary" onClick={openCamera}>
              <Camera size={18} /> Retake mine
            </Button>
          </div>
        ) : (
          !isLoading && (
            <div className="flex justify-center">
              <Button
                onClick={openCamera}
                className={pulseShoot ? 'shoot-cta' : undefined}
              >
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

      {/* The phone's own camera. Front lens, no preview of ours, no permission
          prompt - the shot comes back as a file and the cropper below makes it
          square, so what gets saved is still a polaroid. */}
      <input
        ref={shootRef}
        type="file"
        accept="image/*"
        capture="user"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) setCropping({ day: myToday, file });
        }}
      />

      <CatchUpSheet
        open={catchUpOpen}
        onClose={() => {
          setCatchUpOpen(false);
          setUrgentDay(null);
        }}
        days={eligible}
        filled={filled}
        selfZone={self?.timezone}
        partnerName={partnerName}
        urgentDay={urgentDay}
        onPick={(day, file) => {
          setCatchUpOpen(false);
          setUrgentDay(null);
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
  /** Days still writable from here - my love's today included. */
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
                  <div className="mx-auto w-full max-w-[22rem]">
                    <PolaroidPlate
                      caption={d.shared.caption ?? undefined}
                      captionTone="note"
                      onClick={() => onOpen(d.shared!)}
                      label={d.day}
                    >
                      <PolaroidImage
                        path={d.shared.image_path}
                        src={urls?.get(d.shared.image_path)}
                        className="h-full w-full"
                      />
                    </PolaroidPlate>
                  </div>
                ) : (
                  <DoublePolaroid
                    day={d}
                    urls={urls}
                    partnerName={partnerName}
                    partnerZone={partnerZone}
                    stillOpen={openSet.has(d.day)}
                    onShoot={
                      // Her today, still fillable from here - but only via the
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
