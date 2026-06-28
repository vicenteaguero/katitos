import type { Tables } from '@kernel/supabase';

export type Trip = Tables<'trips'>;
export type TripItem = Tables<'trip_items'>;
export type TripPhoto = Tables<'trip_photos'>;
export type TripLeg = Tables<'trip_legs'>;
export type TripReview = Tables<'trip_reviews'>;
export type BudgetSprint = Tables<'budget_sprints'>;
export type BudgetLine = Tables<'budget_lines'>;
export type PackingItem = Tables<'packing_items'>;
export type WorkBlock = Tables<'work_blocks'>;

export type Country = 'TR' | 'GE';
export type CountryFilter = 'all' | Country;

/** The two legs of the summer — Türkiye then Georgia. */
export const COUNTRIES = [
  { code: 'TR', flag: '🇹🇷', label: 'Türkiye', tint: '#b5633a' },
  { code: 'GE', flag: '🇬🇪', label: 'Georgia', tint: '#6e1423' },
] as const;

export const REVIEW_CATEGORIES = [
  { value: 'restaurant', label: 'Restaurant', emoji: '🍽️' },
  { value: 'food', label: 'Food', emoji: '🥘' },
  { value: 'airbnb', label: 'Stay', emoji: '🛏️' },
  { value: 'car', label: 'Car rental', emoji: '🚗' },
  { value: 'museum', label: 'Museum', emoji: '🏛️' },
  { value: 'view', label: 'View', emoji: '🌄' },
  { value: 'shop', label: 'Shop', emoji: '🛍️' },
  { value: 'other', label: 'Other', emoji: '✦' },
] as const;

export const summerKeys = {
  trip: () => ['summer', 'trip'] as const,
};
