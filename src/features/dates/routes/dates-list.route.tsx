import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { CalendarClock, MapPin, Plus } from 'lucide-react';
import { qk } from '@kernel/query';
import { useTableSync } from '@kernel/realtime';
import { formatDateTime } from '@kernel/lib';
import {
  Badge,
  Card,
  Empty,
  Fab,
  LoadingScreen,
  PageHeader,
  Segmented,
  Sheet,
} from '@kernel/ui';
import type { SegmentOption } from '@kernel/ui';
import { useDates } from '../api/dates.queries';
import { DateForm } from '../components/date-form';
import { StarsDisplay } from '../components/stars';
import {
  asDateStatus,
  averageStars,
  STATUS_LABELS,
  STATUS_TONES,
  type DateWithRatings,
} from '../types';

type Filter = 'all' | 'idea' | 'scheduled' | 'done';

const filters: SegmentOption<Filter>[] = [
  { value: 'all', label: 'All' },
  { value: 'idea', label: 'Ideas' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'done', label: 'Done' },
];

function DateCard({ date }: { date: DateWithRatings }) {
  const status = asDateStatus(date.status);
  const avg = averageStars(date.date_ratings);
  return (
    <Link to={`/dates/${date.id}`} className="block">
      <Card className="space-y-2 transition active:bg-surface-2">
        <div className="flex items-start justify-between gap-3">
          <h3 className="min-w-0 truncate text-lg font-semibold">
            {date.title}
          </h3>
          <Badge tone={STATUS_TONES[status]} className="shrink-0">
            {STATUS_LABELS[status]}
          </Badge>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
          {date.place && (
            <span className="inline-flex items-center gap-1">
              <MapPin size={14} /> {date.place}
            </span>
          )}
          {date.scheduled_at && (
            <span className="inline-flex items-center gap-1">
              <CalendarClock size={14} /> {formatDateTime(date.scheduled_at)}
            </span>
          )}
          {date.category && <span>· {date.category}</span>}
        </div>
        {avg != null && <StarsDisplay value={avg} />}
      </Card>
    </Link>
  );
}

export function DatesListRoute() {
  useTableSync('dates', qk.dates.list());

  const { data, isLoading, isError } = useDates();
  const [filter, setFilter] = useState<Filter>('all');
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  const visible = useMemo(() => {
    if (!data) return [];
    if (filter === 'all') return data;
    return data.filter((d) => asDateStatus(d.status) === filter);
  }, [data, filter]);

  return (
    <div>
      <PageHeader title="Dates" subtitle="Plan, rate, remember" />

      <div className="mb-4">
        <Segmented options={filters} value={filter} onChange={setFilter} />
      </div>

      {isLoading ? (
        <LoadingScreen />
      ) : isError ? (
        <Empty icon="⚠️" title="Couldn't load" hint="Try again in a moment." />
      ) : visible.length === 0 ? (
        <Empty
          icon="🗓️"
          title={
            data && data.length > 0 ? 'None in this filter' : 'No dates yet'
          }
          hint={
            data && data.length > 0
              ? 'Try another status filter.'
              : 'Tap + to plan one or jot down an idea.'
          }
        />
      ) : (
        <div className="space-y-3">
          {visible.map((d) => (
            <DateCard key={d.id} date={d} />
          ))}
        </div>
      )}

      <Fab label="New date" onClick={() => setCreating(true)}>
        <Plus />
      </Fab>

      <Sheet
        open={creating}
        onClose={() => setCreating(false)}
        title="New date"
      >
        <DateForm
          onCreated={(id) => {
            setCreating(false);
            void navigate(`/dates/${id}`);
          }}
        />
      </Sheet>
    </div>
  );
}
