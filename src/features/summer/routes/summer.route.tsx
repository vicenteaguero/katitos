import { useEffect, useRef, useState } from 'react';
import {
  BookOpen,
  CalendarClock,
  Images,
  ListChecks,
  Luggage,
  Map as MapIcon,
  Star,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { useNow } from '@kernel/hooks';
import { countdownTo, DateTime, cn } from '@kernel/lib';
import { Button, Empty, LoadingScreen } from '@kernel/ui';
import { useSummerTrip } from '../api/summer.queries';
import { useCreateSummerTrip } from '../api/summer.mutations';
import { CountrySwitch } from '../components/country-switch';
import type { CountryFilter, Trip } from '../types';
import { PlanTab } from './tabs/plan.tab';
import { MapTab } from './tabs/map.tab';
import { ReviewsTab } from './tabs/reviews.tab';
import { BudgetTab } from './tabs/budget.tab';
import { WorkTab } from './tabs/work.tab';
import { PackTab } from './tabs/pack.tab';
import { AlbumTab } from './tabs/album.tab';
import { PaniniTab } from './tabs/panini.tab';

type Tab =
  | 'plan'
  | 'map'
  | 'reviews'
  | 'budget'
  | 'work'
  | 'pack'
  | 'album'
  | 'panini';

const TABS: { id: Tab; label: string; icon: LucideIcon }[] = [
  { id: 'plan', label: 'Plan', icon: ListChecks },
  { id: 'map', label: 'Route', icon: MapIcon },
  { id: 'reviews', label: 'Reviews', icon: Star },
  { id: 'budget', label: 'Budget', icon: Wallet },
  { id: 'work', label: 'Work', icon: CalendarClock },
  { id: 'pack', label: 'Pack', icon: Luggage },
  { id: 'album', label: 'Postcards', icon: Images },
  { id: 'panini', label: 'Panini', icon: BookOpen },
];

export function SummerRoute() {
  const { data: trip, isLoading } = useSummerTrip();
  const createTrip = useCreateSummerTrip();
  const now = useNow(60_000);
  const [tab, setTab] = useState<Tab>('plan');
  const [country, setCountry] = useState<CountryFilter>('all');

  // The one Summer trip just exists. If the DB has no row (fresh/cloud, seeds
  // don't run there), materialize it once, silently — incl. the route legs.
  const triedCreate = useRef(false);
  useEffect(() => {
    if (!isLoading && !trip && !triedCreate.current) {
      triedCreate.current = true;
      createTrip.mutate();
    }
  }, [isLoading, trip, createTrip]);

  if (isLoading || (!trip && !createTrip.isError)) return <LoadingScreen />;
  if (!trip)
    return (
      <Empty
        icon="🧳"
        title="Summer is taking a moment"
        hint={createTrip.error?.message ?? 'Tap to retry.'}
        action={
          <Button
            onClick={() => createTrip.mutate()}
            disabled={createTrip.isPending}
          >
            Retry
          </Button>
        }
      />
    );

  const c = trip.start_date
    ? countdownTo(DateTime.fromISO(trip.start_date), now)
    : null;

  return (
    <div className="curtain-reveal space-y-4">
      {/* Slim hero: dates + countdown on one row (no big duplicate title). */}
      <div className="flex items-center justify-between gap-3 rounded-lg bg-surface-2 px-4 py-3">
        <div className="min-w-0">
          <p className="truncate font-display text-lg font-semibold text-fg">
            {trip.name}
          </p>
          {trip.start_date && (
            <p className="font-sans text-[0.7rem] uppercase tracking-[0.18em] text-muted">
              {DateTime.fromISO(trip.start_date).toFormat('LLL d')}
              {trip.end_date
                ? ` – ${DateTime.fromISO(trip.end_date).toFormat('LLL d')}`
                : ''}
            </p>
          )}
        </div>
        {c && (
          <div className="shrink-0 text-right">
            <span className="gilt-text gilt-figures font-display text-3xl font-semibold leading-none">
              {c.isPast ? '✦' : c.days}
            </span>
            {!c.isPast && (
              <span className="ml-1 font-sans text-[0.65rem] uppercase tracking-[0.18em] text-copper">
                days
              </span>
            )}
          </div>
        )}
      </div>

      <CountrySwitch value={country} onChange={setCountry} />

      {/* Dense, scrollable icon tab strip. */}
      <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 [-webkit-overflow-scrolling:touch] [scrollbar-width:none]">
        {TABS.map((t) => {
          const active = t.id === tab;
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                'flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 font-sans text-[0.8rem] font-semibold transition-colors',
                active ? 'bg-accent text-accent-fg' : 'bg-surface-2 text-muted'
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      <SummerTab tab={tab} trip={trip} country={country} />
    </div>
  );
}

function SummerTab({
  tab,
  trip,
  country,
}: {
  tab: Tab;
  trip: Trip;
  country: CountryFilter;
}) {
  switch (tab) {
    case 'plan':
      return <PlanTab trip={trip} country={country} />;
    case 'map':
      return <MapTab trip={trip} country={country} />;
    case 'reviews':
      return <ReviewsTab trip={trip} country={country} />;
    case 'budget':
      return <BudgetTab trip={trip} />;
    case 'work':
      return <WorkTab />;
    case 'pack':
      return <PackTab trip={trip} />;
    case 'album':
      return <AlbumTab trip={trip} country={country} />;
    case 'panini':
      return <PaniniTab trip={trip} />;
  }
}
