import { useMutation, useQueryClient } from '@tanstack/react-query';
import { nanoid } from 'nanoid';
import { supabase } from '@kernel/supabase';
import { usePartner, useUserId } from '@kernel/auth';
import { notifyPartner } from '@kernel/push';
import { BUCKETS, usePhotoUpload } from '@kernel/storage';
import { qk } from '@kernel/query';

/**
 * Turn a Postgres error from the polaroid guard into something worth reading.
 *
 * The trigger raises P0001 with a machine-readable `hint`, the same way
 * `water_tree` raises 'not your turn' — so the UI can say what actually
 * happened instead of surfacing a raw constraint name.
 */
export function polaroidErrorMessage(err: unknown): string {
  const e = err as { hint?: string; code?: string; message?: string };
  switch (e?.hint) {
    case 'day_closed':
      return "That day has ended for both of us — it's closed now 🌙";
    case 'not_owner':
      return "That's your love's photo — you can only change your own";
    case 'shared_locked':
      return 'That one belongs to our history 🤍';
    case 'day_shared':
      return 'That day already has one of our old shared photos';
  }
  // Phase 1 only: the old one-per-day constraint is still in place, so the
  // second of us to shoot on a given day lands here until phase 3 ships.
  if (e?.code === '23505') return 'A photo is already saved for that day';
  return e?.message ?? 'Something went wrong';
}

function invalidate(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: qk.polaroids.all() });
}

/**
 * Save (or replace) YOUR photo for a day.
 *
 * Every shot lands at a unique versioned path, so a retake never deletes the
 * bytes it replaces — the old photo just stops being referenced.
 *
 * `user_id` is sent explicitly and the conflict target is `(day, user_id)`:
 * your retake updates your row and cannot touch your love's.
 */
export function useUpsertPolaroid() {
  const qc = useQueryClient();
  const userId = useUserId();
  const { self } = usePartner();
  const selfName = self?.role === 'a' ? 'Katito' : 'Katita';
  const { uploadPhoto } = usePhotoUpload();

  return useMutation({
    mutationFn: async ({
      day,
      blob,
      caption,
    }: {
      day: string;
      blob: Blob;
      caption?: string | null;
    }) => {
      if (!userId) throw new Error('Not signed in');
      const path = `${day}/${nanoid(10)}.jpg`;
      await uploadPhoto(BUCKETS.polaroids, path, blob);

      const { error } = await supabase.from('polaroids').upsert(
        {
          day,
          user_id: userId,
          image_path: path,
          caption: caption ?? null,
        },
        { onConflict: 'day,user_id' }
      );

      if (error) {
        // The row was refused (closed day, or phase-1's one-per-day rule), so
        // the bytes we just uploaded are orphaned. Clean them up rather than
        // leaving litter in the bucket every time someone is a minute late.
        await supabase.storage
          .from(BUCKETS.polaroids)
          .remove([path, `thumbs/${path}`])
          .catch(() => {});
        throw error;
      }
      return { path };
    },
    onSuccess: (_data, vars) => {
      invalidate(qc);
      // Bust the signed-url caches so the new photo actually reloads.
      void qc.invalidateQueries({ queryKey: ['signed-url'] });
      void qc.invalidateQueries({ queryKey: ['signed-urls'] });

      // The nudge that makes the daily habit work: your love learns their day
      // is up, and — if theirs isn't — that it's their turn.
      void notifyPartner({
        kind: 'polaroid',
        title: `📸 ${selfName ?? 'Your love'}'s day is up`,
        body: vars.caption?.trim() || 'Your turn 🤍',
        url: '/polaroid',
      });
    },
  });
}

/**
 * Rename a photo's caption — either of us, on either photo, forever.
 *
 * Keyed by row id, NOT by day: with two photos on a day, `.eq('day', …)` would
 * quietly rewrite both captions at once.
 */
export function useSetPolaroidCaption() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, caption }: { id: string; caption: string }) => {
      const { error } = await supabase
        .from('polaroids')
        .update({ caption: caption.trim() || null })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => invalidate(qc),
  });
}
