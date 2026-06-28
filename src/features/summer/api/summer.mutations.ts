import { useMutation, useQueryClient } from '@tanstack/react-query';
import { nanoid } from 'nanoid';
import { supabase } from '@kernel/supabase';
import { BUCKETS, storagePaths, usePhotoUpload } from '@kernel/storage';
import { qk } from '@kernel/query';
import { toast } from '@kernel/ui';
import { summerKeys } from '../types';

/** The legs of the route, seeded once on first creation (prod has no seed). */
const SEED_LEGS = [
  {
    position: 0,
    from_label: 'Istanbul',
    to_label: 'Trabzon',
    from_lat: 41.0082,
    from_lng: 28.9784,
    to_lat: 41.0015,
    to_lng: 39.7178,
    mode: 'car',
    country: 'TR',
  },
  {
    position: 1,
    from_label: 'Trabzon',
    to_label: 'Batumi',
    from_lat: 41.0015,
    from_lng: 39.7178,
    to_lat: 41.6168,
    to_lng: 41.6367,
    mode: 'bus',
    country: null,
  },
  {
    position: 2,
    from_label: 'Batumi',
    to_label: 'Tbilisi',
    from_lat: 41.6168,
    from_lng: 41.6367,
    to_lat: 41.7151,
    to_lng: 44.8271,
    mode: 'car',
    country: 'GE',
  },
] as const;

/** Create the one special Summer trip when none exists + seed the route legs. */
export function useCreateSummerTrip() {
  const qc = useQueryClient();
  return useMutation({
    onError: (e: Error) => toast.error(e.message),
    mutationFn: async () => {
      const { data, error } = await supabase
        .from('trips')
        .insert({
          slug: 'summer-2026',
          name: 'Summer 2026',
          destination: 'Türkiye → Georgia',
          start_date: '2026-07-07',
          end_date: '2026-08-04',
          is_special: true,
        })
        .select()
        .single();
      if (error) throw error;
      // Seed the multi-leg route (best-effort; ignore if it races).
      await supabase
        .from('trip_legs')
        .insert(SEED_LEGS.map((l) => ({ ...l, trip_id: data.id })));
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: summerKeys.trip() }),
  });
}

// ── Itinerary items ─────────────────────────────────────────────────────────
export function useAddItem() {
  const qc = useQueryClient();
  return useMutation({
    onError: (e: Error) => toast.error(e.message),
    mutationFn: async (input: {
      tripId: string;
      kind: string;
      title: string;
      description?: string | null;
      link?: string | null;
      country?: string | null;
      day?: string | null;
      lat?: number | null;
      lng?: number | null;
    }) => {
      const { error } = await supabase.from('trip_items').insert({
        trip_id: input.tripId,
        kind: input.kind,
        title: input.title,
        description: input.description ?? null,
        link: input.link ?? null,
        country: input.country ?? null,
        day: input.day ?? null,
        lat: input.lat ?? null,
        lng: input.lng ?? null,
      });
      if (error) throw error;
    },
    onSuccess: (_d, v) =>
      qc.invalidateQueries({ queryKey: qk.trips.items(v.tripId) }),
  });
}

export function useUpdateItem() {
  const qc = useQueryClient();
  return useMutation({
    onError: (e: Error) => toast.error(e.message),
    mutationFn: async (v: {
      id: string;
      tripId: string;
      patch: {
        title?: string;
        description?: string | null;
        link?: string | null;
        country?: string | null;
        day?: string | null;
        lat?: number | null;
        lng?: number | null;
        status?: string;
      };
    }) => {
      const { error } = await supabase
        .from('trip_items')
        .update(v.patch)
        .eq('id', v.id);
      if (error) throw error;
    },
    onSuccess: (_d, v) =>
      qc.invalidateQueries({ queryKey: qk.trips.items(v.tripId) }),
  });
}

export function useToggleItem() {
  const qc = useQueryClient();
  return useMutation({
    onError: (e: Error) => toast.error(e.message),
    mutationFn: async (v: { id: string; tripId: string; status: string }) => {
      const { error } = await supabase
        .from('trip_items')
        .update({ status: v.status })
        .eq('id', v.id);
      if (error) throw error;
    },
    onSuccess: (_d, v) =>
      qc.invalidateQueries({ queryKey: qk.trips.items(v.tripId) }),
  });
}

export function useDeleteItem() {
  const qc = useQueryClient();
  return useMutation({
    onError: (e: Error) => toast.error(e.message),
    mutationFn: async (v: { id: string; tripId: string }) => {
      const { error } = await supabase
        .from('trip_items')
        .delete()
        .eq('id', v.id);
      if (error) throw error;
    },
    onSuccess: (_d, v) =>
      qc.invalidateQueries({ queryKey: qk.trips.items(v.tripId) }),
  });
}

export function useAddItemPhoto() {
  const qc = useQueryClient();
  const { uploadPhoto } = usePhotoUpload();
  return useMutation({
    onError: (e: Error) => toast.error(e.message),
    mutationFn: async (v: { id: string; tripId: string; blob: Blob }) => {
      const path = storagePaths.tripItemPhoto(v.id);
      await uploadPhoto(BUCKETS.georgiaAlbum, path, v.blob);
      const { error } = await supabase
        .from('trip_items')
        .update({ image_path: path })
        .eq('id', v.id);
      if (error) throw error;
    },
    onSuccess: (_d, v) =>
      qc.invalidateQueries({ queryKey: qk.trips.items(v.tripId) }),
  });
}

// ── Postcards (trip album grid) ─────────────────────────────────────────────
export function useAddPhoto() {
  const qc = useQueryClient();
  const { uploadPhoto } = usePhotoUpload();
  return useMutation({
    onError: (e: Error) => toast.error(e.message),
    mutationFn: async (v: {
      tripId: string;
      blob: Blob;
      country?: string | null;
      caption?: string | null;
    }) => {
      const fileId = nanoid(8);
      const path = storagePaths.tripPhoto(v.tripId, fileId);
      await uploadPhoto(BUCKETS.georgiaAlbum, path, v.blob);
      const { error } = await supabase.from('trip_photos').insert({
        trip_id: v.tripId,
        image_path: path,
        country: v.country ?? null,
        caption: v.caption ?? null,
      });
      if (error) throw error;
    },
    onSuccess: (_d, v) =>
      qc.invalidateQueries({ queryKey: qk.trips.photos(v.tripId) }),
  });
}

export function useDeletePhoto() {
  const qc = useQueryClient();
  return useMutation({
    onError: (e: Error) => toast.error(e.message),
    mutationFn: async (v: { id: string; tripId: string }) => {
      const { error } = await supabase
        .from('trip_photos')
        .delete()
        .eq('id', v.id);
      if (error) throw error;
    },
    onSuccess: (_d, v) =>
      qc.invalidateQueries({ queryKey: qk.trips.photos(v.tripId) }),
  });
}

// ── Reviews ─────────────────────────────────────────────────────────────────
export function useAddReview() {
  const qc = useQueryClient();
  const { uploadPhoto } = usePhotoUpload();
  return useMutation({
    onError: (e: Error) => toast.error(e.message),
    mutationFn: async (v: {
      tripId: string;
      country?: string | null;
      category: string;
      name: string;
      stars?: number | null;
      notes?: string | null;
      link?: string | null;
      lat?: number | null;
      lng?: number | null;
      blob?: Blob | null;
    }) => {
      const id = nanoid();
      let image_path: string | null = null;
      if (v.blob) {
        image_path = storagePaths.tripReview(id);
        await uploadPhoto(BUCKETS.georgiaAlbum, image_path, v.blob);
      }
      const { error } = await supabase.from('trip_reviews').insert({
        id,
        trip_id: v.tripId,
        country: v.country ?? null,
        category: v.category,
        name: v.name,
        stars: v.stars ?? null,
        notes: v.notes ?? null,
        link: v.link ?? null,
        lat: v.lat ?? null,
        lng: v.lng ?? null,
        image_path,
      });
      if (error) throw error;
    },
    onSuccess: (_d, v) =>
      qc.invalidateQueries({ queryKey: qk.trips.reviews(v.tripId) }),
  });
}

export function useUpdateReview() {
  const qc = useQueryClient();
  return useMutation({
    onError: (e: Error) => toast.error(e.message),
    mutationFn: async (v: {
      id: string;
      tripId: string;
      patch: {
        category?: string;
        name?: string;
        stars?: number | null;
        notes?: string | null;
        link?: string | null;
        country?: string | null;
      };
    }) => {
      const { error } = await supabase
        .from('trip_reviews')
        .update(v.patch)
        .eq('id', v.id);
      if (error) throw error;
    },
    onSuccess: (_d, v) =>
      qc.invalidateQueries({ queryKey: qk.trips.reviews(v.tripId) }),
  });
}

export function useDeleteReview() {
  const qc = useQueryClient();
  return useMutation({
    onError: (e: Error) => toast.error(e.message),
    mutationFn: async (v: { id: string; tripId: string }) => {
      const { error } = await supabase
        .from('trip_reviews')
        .delete()
        .eq('id', v.id);
      if (error) throw error;
    },
    onSuccess: (_d, v) =>
      qc.invalidateQueries({ queryKey: qk.trips.reviews(v.tripId) }),
  });
}

// ── Budget sprints + lines ──────────────────────────────────────────────────
export function useAddSprint() {
  const qc = useQueryClient();
  return useMutation({
    onError: (e: Error) => toast.error(e.message),
    mutationFn: async (v: {
      tripId: string;
      name: string;
      anchorDate?: string | null;
      position?: number;
    }) => {
      const { error } = await supabase.from('budget_sprints').insert({
        trip_id: v.tripId,
        name: v.name,
        anchor_date: v.anchorDate ?? null,
        position: v.position ?? 0,
      });
      if (error) throw error;
    },
    onSuccess: (_d, v) =>
      qc.invalidateQueries({ queryKey: qk.trips.sprints(v.tripId) }),
  });
}

export function useDeleteSprint() {
  const qc = useQueryClient();
  return useMutation({
    onError: (e: Error) => toast.error(e.message),
    mutationFn: async (v: { id: string; tripId: string }) => {
      const { error } = await supabase
        .from('budget_sprints')
        .delete()
        .eq('id', v.id);
      if (error) throw error;
    },
    onSuccess: (_d, v) =>
      qc.invalidateQueries({ queryKey: qk.trips.sprints(v.tripId) }),
  });
}

export function useAddLine() {
  const qc = useQueryClient();
  return useMutation({
    onError: (e: Error) => toast.error(e.message),
    mutationFn: async (v: {
      sprintId: string;
      label?: string | null;
      currency: string;
      planned: number;
      spent?: number;
    }) => {
      const { error } = await supabase.from('budget_lines').insert({
        sprint_id: v.sprintId,
        label: v.label ?? null,
        currency: v.currency,
        planned_amount: v.planned,
        spent_amount: v.spent ?? 0,
      });
      if (error) throw error;
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['trips', 'budget-lines'] }),
  });
}

export function useUpdateLine() {
  const qc = useQueryClient();
  return useMutation({
    onError: (e: Error) => toast.error(e.message),
    mutationFn: async (v: {
      id: string;
      patch: {
        label?: string | null;
        currency?: string;
        planned_amount?: number;
        spent_amount?: number;
      };
    }) => {
      const { error } = await supabase
        .from('budget_lines')
        .update(v.patch)
        .eq('id', v.id);
      if (error) throw error;
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['trips', 'budget-lines'] }),
  });
}

export function useDeleteLine() {
  const qc = useQueryClient();
  return useMutation({
    onError: (e: Error) => toast.error(e.message),
    mutationFn: async (v: { id: string }) => {
      const { error } = await supabase
        .from('budget_lines')
        .delete()
        .eq('id', v.id);
      if (error) throw error;
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['trips', 'budget-lines'] }),
  });
}

// ── Packing ─────────────────────────────────────────────────────────────────
export function useAddPacking() {
  const qc = useQueryClient();
  return useMutation({
    onError: (e: Error) => toast.error(e.message),
    mutationFn: async (v: {
      tripId: string;
      label: string;
      category?: string | null;
      assignedTo?: string | null;
    }) => {
      const { error } = await supabase.from('packing_items').insert({
        trip_id: v.tripId,
        label: v.label,
        category: v.category ?? null,
        assigned_to: v.assignedTo ?? null,
      });
      if (error) throw error;
    },
    onSuccess: (_d, v) =>
      qc.invalidateQueries({ queryKey: qk.trips.packing(v.tripId) }),
  });
}

export function useTogglePacking() {
  const qc = useQueryClient();
  return useMutation({
    onError: (e: Error) => toast.error(e.message),
    mutationFn: async (v: { id: string; tripId: string; packed: boolean }) => {
      const { error } = await supabase
        .from('packing_items')
        .update({ packed: v.packed })
        .eq('id', v.id);
      if (error) throw error;
    },
    onSuccess: (_d, v) =>
      qc.invalidateQueries({ queryKey: qk.trips.packing(v.tripId) }),
  });
}

export function useDeletePacking() {
  const qc = useQueryClient();
  return useMutation({
    onError: (e: Error) => toast.error(e.message),
    mutationFn: async (v: { id: string; tripId: string }) => {
      const { error } = await supabase
        .from('packing_items')
        .delete()
        .eq('id', v.id);
      if (error) throw error;
    },
    onSuccess: (_d, v) =>
      qc.invalidateQueries({ queryKey: qk.trips.packing(v.tripId) }),
  });
}

// ── Work blocks ─────────────────────────────────────────────────────────────
export function useAddWorkBlock() {
  const qc = useQueryClient();
  return useMutation({
    onError: (e: Error) => toast.error(e.message),
    mutationFn: async (v: {
      weekKey: string;
      day: string;
      startMin: number;
      endMin: number;
      title?: string | null;
    }) => {
      const { error } = await supabase.from('work_blocks').insert({
        day: v.day,
        start_min: v.startMin,
        end_min: v.endMin,
        title: v.title ?? null,
      });
      if (error) throw error;
    },
    onSuccess: (_d, v) =>
      qc.invalidateQueries({ queryKey: qk.work.week(v.weekKey) }),
  });
}

export function useDeleteWorkBlock() {
  const qc = useQueryClient();
  return useMutation({
    onError: (e: Error) => toast.error(e.message),
    mutationFn: async (v: { id: string; weekKey: string }) => {
      const { error } = await supabase
        .from('work_blocks')
        .delete()
        .eq('id', v.id);
      if (error) throw error;
    },
    onSuccess: (_d, v) =>
      qc.invalidateQueries({ queryKey: qk.work.week(v.weekKey) }),
  });
}
