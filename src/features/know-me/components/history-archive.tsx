import type { CSSProperties } from 'react';
import { usePartner } from '@kernel/auth';
import { Card, Empty } from '@kernel/ui';
import { useHistoryEntries } from '../api/know-me.queries';

/** Reverse-chronological list of completed days with both truths + ✓/✗. */
export function HistoryArchive() {
  const { partner } = usePartner();
  const { data: entries } = useHistoryEntries();
  const partnerName = partner?.display_name ?? 'them';

  if (!entries || entries.length === 0)
    return (
      <Empty
        icon="📖"
        title="No history yet"
        hint="Play a day together to start your archive."
      />
    );

  return (
    <div className="curtain-stagger space-y-3.5">
      {entries.map((e, i) => (
        <Card
          key={e.coupleDay}
          className="space-y-2.5"
          style={{ '--i': i } as CSSProperties}
        >
          <div className="flex items-center justify-between font-sans text-xs uppercase tracking-[0.1em] text-muted">
            <span className="tabular-nums">{e.coupleDay}</span>
            <span className="tracking-normal">
              <b className={e.selfRight ? 'text-success' : 'text-muted'}>
                {e.selfRight ? '✓' : '✗'}
              </b>{' '}
              you · {partnerName}{' '}
              <b className={e.partnerRight ? 'text-success' : 'text-muted'}>
                {e.partnerRight ? '✓' : '✗'}
              </b>
            </span>
          </div>
          <p className="font-display text-xl font-medium leading-snug tracking-tight text-fg">
            {e.prompt}
          </p>
          <div className="font-sans text-xs text-muted">
            You: <b className="font-semibold text-fg">{e.selfOwnLabel}</b> ·{' '}
            {partnerName}:{' '}
            <b className="font-semibold text-fg">{e.partnerOwnLabel}</b>
          </div>
        </Card>
      ))}
    </div>
  );
}
