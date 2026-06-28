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
import { cn } from '@kernel/lib';
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
  const [tab, setTab] = useState<Tab>('plan');
  const [country, setCountry] = useState<CountryFilter>('all');
  const stripRef = useRef<HTMLDivElement>(null);

  // Slide the active tab into view when it changes (so taps near the edge
  // don't leave the active pill half-hidden).
  useEffect(() => {
    stripRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({
      behavior: 'smooth',
      inline: 'center',
      block: 'nearest',
    });
  }, [tab]);

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

  return (
    <div className="curtain-reveal -mt-2 space-y-4">
      <CountrySwitch value={country} onChange={setCountry} />

      {/* Dense, scrollable icon tab strip, with a soft right-edge fade so the
          overflow reads as "scroll for more" rather than a cut-off. */}
      <div className="relative -mx-1">
        <div
          ref={stripRef}
          className="flex gap-1.5 overflow-x-auto px-1 pb-1 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {TABS.map((t) => {
            const active = t.id === tab;
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                data-active={active}
                onClick={() => setTab(t.id)}
                className={cn(
                  'lift-press flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 font-sans text-[0.8rem] font-semibold transition-colors',
                  active
                    ? 'bg-accent text-accent-fg shadow-loge'
                    : 'bg-surface-2 text-muted'
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>
        <div
          className="pointer-events-none absolute inset-y-0 right-0 w-10"
          style={{
            background:
              'linear-gradient(to left, var(--color-surface), transparent)',
          }}
          aria-hidden="true"
        />
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
