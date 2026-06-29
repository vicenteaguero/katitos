import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { useTableSync } from '@kernel/realtime';
import { qk } from '@kernel/query';
import { usePartner } from '@kernel/auth';
import { DateTime, cn } from '@kernel/lib';
import {
  Button,
  Field,
  IconButton,
  Input,
  Sheet,
  useTopBarAction,
} from '@kernel/ui';
import { useWorkBlocks } from '../../api/summer.queries';
import {
  useAddWorkBlock,
  useDeleteWorkBlock,
} from '../../api/summer.mutations';
import { TopAdd } from '../../components/top-add';

const ROLE_TONE: Record<string, string> = {
  a: '#6f9bd8',
  b: '#d98fb0',
};

function hhmm(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
function toMin(hhmmStr: string): number {
  const [h, m] = hhmmStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function WorkTab() {
  const { self, partner } = usePartner();
  const [offset, setOffset] = useState(0);

  const weekStart = useMemo(
    () => DateTime.now().startOf('week').plus({ weeks: offset }),
    [offset]
  );
  const weekKey = weekStart.toFormat('yyyy-MM-dd');
  const weekEnd = weekStart.plus({ days: 6 });

  useTableSync('work_blocks', qk.work.week(weekKey), { enabled: true });
  const { data: blocks } = useWorkBlocks(
    weekKey,
    weekEnd.toFormat('yyyy-MM-dd')
  );
  const addBlock = useAddWorkBlock();
  const delBlock = useDeleteWorkBlock();

  const [form, setForm] = useState<{
    open: boolean;
    day: string;
    start: string;
    end: string;
    title: string;
  }>({ open: false, day: '', start: '09:00', end: '17:00', title: '' });

  const days = Array.from({ length: 7 }, (_, i) => weekStart.plus({ days: i }));

  // Top-bar Add defaults to today (when it's in this week), else the week start.
  const todayIso = DateTime.now().toFormat('yyyy-MM-dd');
  const inWeek = days.some((d) => d.toFormat('yyyy-MM-dd') === todayIso);
  const defaultDay = inWeek ? todayIso : weekStart.toFormat('yyyy-MM-dd');
  useTopBarAction(
    <TopAdd
      onClick={() =>
        setForm({
          open: true,
          day: defaultDay,
          start: '09:00',
          end: '17:00',
          title: '',
        })
      }
    />,
    [defaultDay]
  );

  const roleOf = (userId: string) =>
    userId === self?.user_id
      ? self?.role
      : userId === partner?.user_id
        ? partner?.role
        : undefined;
  const nameOf = (userId: string) =>
    userId === self?.user_id ? 'Me' : (partner?.display_name ?? 'Partner');

  const submit = () => {
    if (!form.day) return;
    addBlock.mutate(
      {
        weekKey,
        day: form.day,
        startMin: toMin(form.start),
        endMin: toMin(form.end),
        title: form.title || null,
      },
      { onSuccess: () => setForm((f) => ({ ...f, open: false, title: '' })) }
    );
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <IconButton
          label="Previous week"
          onClick={() => setOffset((o) => o - 1)}
        >
          <ChevronLeft className="h-5 w-5" />
        </IconButton>
        <p className="font-sans text-sm font-semibold text-fg">
          {weekStart.toFormat('LLL d')} – {weekEnd.toFormat('LLL d')}
        </p>
        <IconButton label="Next week" onClick={() => setOffset((o) => o + 1)}>
          <ChevronRight className="h-5 w-5" />
        </IconButton>
      </div>

      {/* Legend. */}
      <div className="flex items-center gap-4 font-sans text-[0.7rem] text-muted">
        {[self, partner].filter(Boolean).map((m) => (
          <span key={m!.user_id} className="flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ background: ROLE_TONE[m!.role ?? 'a'] }}
            />
            {m!.user_id === self?.user_id ? 'Me' : m!.display_name}
          </span>
        ))}
      </div>

      <div className="overflow-hidden rounded-lg bg-surface-2">
        {days.map((d, i) => {
          const iso = d.toFormat('yyyy-MM-dd');
          const dayBlocks = (blocks ?? []).filter((b) => b.day === iso);
          const isToday = iso === DateTime.now().toFormat('yyyy-MM-dd');
          const openAdd = () =>
            setForm({
              open: true,
              day: iso,
              start: '09:00',
              end: '17:00',
              title: '',
            });
          return (
            <div
              key={iso}
              className={cn(
                'px-4 py-2.5',
                i > 0 && 'border-t border-[rgba(255,255,255,0.05)]'
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-baseline gap-2.5">
                  <span
                    className={cn(
                      'w-9 font-sans text-sm font-semibold',
                      isToday ? 'text-accent' : 'text-fg'
                    )}
                  >
                    {d.toFormat('ccc')}
                  </span>
                  <span className="font-sans text-xs text-muted">
                    {d.toFormat('LLL d')}
                  </span>
                  {isToday && (
                    <span className="rounded-full bg-accent px-1.5 py-0.5 font-sans text-[0.55rem] font-bold uppercase tracking-wider text-accent-fg">
                      now
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2.5">
                  {dayBlocks.length === 0 && (
                    <span className="font-sans text-xs text-muted">Free</span>
                  )}
                  <button
                    type="button"
                    aria-label="Add work"
                    onClick={openAdd}
                    className="lift-press text-muted"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {dayBlocks.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  {dayBlocks.map((b) => {
                    const tone = ROLE_TONE[roleOf(b.user_id) ?? 'a'];
                    return (
                      <div
                        key={b.id}
                        className="flex items-center gap-2 rounded-lg px-2.5 py-1.5"
                        style={{ background: `${tone}22` }}
                      >
                        <span
                          className="h-6 w-1 shrink-0 rounded-full"
                          style={{ background: tone }}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-sans text-sm text-fg">
                            {b.title || 'Work'}
                          </p>
                          <p className="font-sans text-[0.7rem] text-muted">
                            {hhmm(b.start_min)}–{hhmm(b.end_min)} ·{' '}
                            {nameOf(b.user_id)}
                          </p>
                        </div>
                        {b.user_id === self?.user_id && (
                          <button
                            type="button"
                            aria-label="Delete"
                            onClick={() =>
                              delBlock.mutate({ id: b.id, weekKey })
                            }
                            className="shrink-0 text-muted"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Sheet
        open={form.open}
        onClose={() => setForm((f) => ({ ...f, open: false }))}
        title="Add work block"
      >
        <div className="space-y-3">
          <Input
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="What — standup, deep work, call…"
            autoFocus
          />
          {/* Stacked, full-width — native time inputs never overlap. */}
          <Field label="From">
            <Input
              type="time"
              value={form.start}
              onChange={(e) =>
                setForm((f) => ({ ...f, start: e.target.value }))
              }
            />
          </Field>
          <Field label="To">
            <Input
              type="time"
              value={form.end}
              onChange={(e) => setForm((f) => ({ ...f, end: e.target.value }))}
            />
          </Field>
          <Button full onClick={submit} disabled={addBlock.isPending}>
            Add to{' '}
            {form.day && DateTime.fromISO(form.day).toFormat('EEE, LLL d')}
          </Button>
        </div>
      </Sheet>
    </section>
  );
}
